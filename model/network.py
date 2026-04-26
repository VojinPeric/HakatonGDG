"""
MIT-BIH Long-Term ECG – Beat Classification
============================================
Poboljšanja:
  - Veći segment (300ms pre + 500ms posle R-pika)
  - Data augmentation na trening skupu
  - Residual CNN arhitektura
  - Early stopping
  - Uklonjen weighted sampler (klase su već balansirane)
"""

import numpy as np
import wfdb
from pathlib import Path
from collections import Counter
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
import seaborn as sns



#IMA PREVISE PARAMETARA ALI DOBRU REGULARIZACIJU I TOP KRIVE ALI RADI SA SAMO UNDERAMPLOVANIM PODACIMA


# ──────────────────────────────────────────
#  Podesavanja
# ──────────────────────────────────────────

DATA_DIR    = r"C:\Users\anama\Desktop\hakaton\mit-bih-long-term-ecg-database-1.0.0\mit-bih-long-term-ecg-database-1.0.0"
ZAPISI      = ['14046', '14134', '14149', '14157', '14172', '14184', '15814']

PRE_MS      = 300    # povecano sa 200
POST_MS     = 500    # povecano sa 400
MIN_UZORAKA = 200

BATCH_SIZE  = 128
EPOCHS      = 50
LR          = 1e-3
PATIENCE    = 7      # early stopping

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Uredjaj: {DEVICE}")

BEAT_SIMBOLI = set('NLRAaJSVFejEf/xQ?')


# ──────────────────────────────────────────
#  Korak 1: Ucitavanje i segmentacija
# ──────────────────────────────────────────

def ucitaj_i_segmentiraj(zapis_id):
    putanja = str(Path(DATA_DIR) / zapis_id)
    record  = wfdb.rdrecord(putanja)
    ann     = wfdb.rdann(putanja, 'atr')

    signal  = record.p_signal
    fs      = record.fs
    N       = signal.shape[0]
    pre     = int(PRE_MS  / 1000 * fs)
    post    = int(POST_MS / 1000 * fs)

    segments, labele = [], []

    for idx, simbol in enumerate(ann.symbol):
        if simbol not in BEAT_SIMBOLI:
            continue
        r = ann.sample[idx]
        if r - pre < 0 or r + post >= N:
            continue

        seg = signal[r - pre : r + post, :2].copy()
        seg = seg - seg.mean(axis=0)
        m   = np.abs(seg).max()
        if m > 0:
            seg = seg / m

        segments.append(seg.astype(np.float32))
        labele.append(simbol)

    return np.array(segments), labele


def ucitaj_dataset():
    svi_segmenti, sve_labele = [], []
    for zapis_id in ZAPISI:
        print(f"  {zapis_id}...", end=' ', flush=True)
        segs, labs = ucitaj_i_segmentiraj(zapis_id)
        svi_segmenti.append(segs)
        sve_labele.extend(labs)
        print(f"{len(labs):,} otkucaja  {Counter(labs)}")

    X = np.concatenate(svi_segmenti, axis=0)
    print(f"\nUkupno: {len(X):,} otkucaja, oblik segmenta: {X.shape[1:]}")
    return X, sve_labele


# ──────────────────────────────────────────
#  Korak 2: Priprema labela
# ──────────────────────────────────────────

def pripremi_labele(X, labele):
    brojac = Counter(labele)
    print("\nDistribucija klasa:")
    for sim, n in sorted(brojac.items(), key=lambda x: -x[1]):
        print(f"  {sim:4s}: {n:8,}")

    retke  = {s for s, n in brojac.items() if n < MIN_UZORAKA}
    if retke:
        print(f"\nIzbaceno (premalo uzoraka): {retke}")

    maska    = np.array([l not in retke for l in labele])
    lab_filt = [l for l, m in zip(labele, maska) if m]
    print(f"Ostalo: {len(lab_filt):,} otkucaja")
    return X[maska], lab_filt


# ──────────────────────────────────────────
#  Korak 3: Undersampling
# ──────────────────────────────────────────

def undersample(X, labele, faktor=1, seed=42):
    np.random.seed(seed)
    brojac    = Counter(labele)
    labele_np = np.array(labele)

    min_klasa = min(brojac, key=brojac.get)
    prag      = brojac[min_klasa] * faktor
    print(f"\nUndersampling – najmanja klasa: {min_klasa} ({brojac[min_klasa]:,})")
    print(f"Prag po klasi: {faktor}x{brojac[min_klasa]:,} = {prag:,}")

    indeksi = []
    for klasa in sorted(set(labele_np)):
        idx = np.where(labele_np == klasa)[0]
        if len(idx) > prag:
            idx = np.random.choice(idx, prag, replace=False)
            print(f"  {klasa:4s}: {brojac[klasa]:8,} -> {prag:,}")
        else:
            print(f"  {klasa:4s}: {brojac[klasa]:8,} (bez promene)")
        indeksi.extend(idx)

    np.random.shuffle(indeksi)
    indeksi = np.array(indeksi)
    print(f"Ukupno posle undersamplinga: {len(indeksi):,}")
    return X[indeksi], list(labele_np[indeksi])


# ──────────────────────────────────────────
#  Korak 4: Podela 70 / 15 / 15
# ──────────────────────────────────────────

def podeli(X, y, seed=42):
    X_tv, X_test, y_tv, y_test = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=seed)
    X_train, X_val, y_train, y_val = train_test_split(
        X_tv, y_tv, test_size=0.15/0.85, stratify=y_tv, random_state=seed)

    print(f"\nTrain: {len(X_train):,} | Val: {len(X_val):,} | Test: {len(X_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test


# ──────────────────────────────────────────
#  Korak 5: Augmentacija i Dataset
# ──────────────────────────────────────────

def augmentuj(seg: np.ndarray) -> np.ndarray:
    """
    Nasumicna augmentacija jednog EKG segmenta.
    seg: (seg_len, 2) -> (seg_len, 2)
    """
    seg = seg.copy()

    # Gaussov sum – simulira sum elektrode
    if np.random.random() < 0.5:
        seg += np.random.normal(0, 0.02, seg.shape).astype(np.float32)

    # Skaliranje amplitude – varijabilnost kontakta elektrode
    if np.random.random() < 0.5:
        seg *= np.random.uniform(0.85, 1.15)

    # Baseline wander – simulira disanje pacijenta
    if np.random.random() < 0.4:
        t = np.linspace(0, 1, seg.shape[0])
        wander = (0.08 * np.sin(2 * np.pi * np.random.uniform(0.1, 0.4) * t))
        seg   += wander[:, np.newaxis].astype(np.float32)

    # Vremenski shift +/-15 samplea
    if np.random.random() < 0.3:
        seg = np.roll(seg, np.random.randint(-15, 15), axis=0)

    # Renormalizacija
    m = np.abs(seg).max()
    if m > 0:
        seg = seg / m

    return seg


class ECGDataset(Dataset):
    def __init__(self, X, y, augmentacija=False):
        self.X            = X
        self.y            = torch.from_numpy(y).long()
        self.augmentacija = augmentacija

    def __len__(self):
        return len(self.y)

    def __getitem__(self, i):
        seg = self.X[i]
        if self.augmentacija:
            seg = augmentuj(seg)
        return torch.from_numpy(seg).permute(1, 0), self.y[i]


def napravi_loadere(X_train, y_train, X_val, y_val, X_test, y_test):
    train_loader = DataLoader(
        ECGDataset(X_train, y_train, augmentacija=True),
        batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(
        ECGDataset(X_val, y_val),
        batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(
        ECGDataset(X_test, y_test),
        batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    return train_loader, val_loader, test_loader


# ──────────────────────────────────────────
#  Korak 6: Residual CNN arhitektura
# ──────────────────────────────────────────

class ResBlok(nn.Module):
    """
    Residual blok sa skip konekcijom:

        x -> Conv -> BN -> ReLU -> Conv -> BN -> (+) -> ReLU -> MaxPool
        |___________________(1x1 ako treba)_________|
    """
    def __init__(self, in_ch, out_ch, kernel=5):
        super().__init__()
        pad = kernel // 2

        self.main = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel, padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
            nn.ReLU(),
            nn.Conv1d(out_ch, out_ch, kernel, padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
        )
        self.skip    = nn.Conv1d(in_ch, out_ch, 1, bias=False) if in_ch != out_ch else nn.Identity()
        self.relu    = nn.ReLU()
        self.maxpool = nn.MaxPool1d(2)

    def forward(self, x):
        return self.maxpool(self.relu(self.main(x) + self.skip(x)))


class ECG_ResCNN(nn.Module):
    """
    Residual 1D CNN.
    Ulaz:  (batch, 2, seg_len)
    Izlaz: (batch, n_klasa)
    """
    def __init__(self, n_klasa):
        super().__init__()

        self.ulaz = nn.Sequential(
            nn.Conv1d(2, 16, kernel_size=7, padding=3, bias=False),
            nn.BatchNorm1d(16),
            nn.ReLU(),
        )
        self.res = nn.Sequential(
            ResBlok(16,  32,  kernel=5),
            ResBlok(32,  64, kernel=5),
            ResBlok(64, 64, kernel=3),
            ResBlok(64, 64, kernel=3),
        )
        self.gap = nn.AdaptiveAvgPool1d(1)
        self.mlp = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(64, n_klasa),
        )

    def forward(self, x):
        return self.mlp(self.gap(self.res(self.ulaz(x))))


# ──────────────────────────────────────────
#  Korak 7: Trening sa early stopping
# ──────────────────────────────────────────

def treniraj(model, train_loader, val_loader, tezine_tensor):
    opt       = torch.optim.Adam(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, patience=3, factor=0.5)
    criterion = nn.CrossEntropyLoss(weight=tezine_tensor.to(DEVICE))

    istorija              = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}
    best_val_loss         = float('inf')
    epohe_bez_poboljsanja = 0

    for ep in range(1, EPOCHS + 1):

        model.train()
        t_loss, t_ok, t_n = 0, 0, 0
        for X_b, y_b in train_loader:
            X_b, y_b = X_b.to(DEVICE), y_b.to(DEVICE)
            opt.zero_grad()
            izlaz = model(X_b)
            loss  = criterion(izlaz, y_b)
            loss.backward()
            opt.step()
            t_loss += loss.item()
            t_ok   += (izlaz.argmax(1) == y_b).sum().item()
            t_n    += len(y_b)

        model.eval()
        v_loss, v_ok, v_n = 0, 0, 0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                X_b, y_b = X_b.to(DEVICE), y_b.to(DEVICE)
                izlaz   = model(X_b)
                v_loss += criterion(izlaz, y_b).item()
                v_ok   += (izlaz.argmax(1) == y_b).sum().item()
                v_n    += len(y_b)

        tl, vl = t_loss / len(train_loader), v_loss / len(val_loader)
        ta, va = t_ok / t_n, v_ok / v_n
        scheduler.step(vl)

        if vl < best_val_loss:
            best_val_loss         = vl
            epohe_bez_poboljsanja = 0
            torch.save(model.state_dict(), 'best_model.pt')
            marker = " <- best"
        else:
            epohe_bez_poboljsanja += 1
            marker = f" (bez poboljsanja: {epohe_bez_poboljsanja}/{PATIENCE})"

        print(f"Ep {ep:3d}/{EPOCHS}  train_loss={tl:.4f} acc={ta:.3f}  val_loss={vl:.4f} acc={va:.3f}{marker}")

        for k, v in zip(['train_loss', 'val_loss', 'train_acc', 'val_acc'], [tl, vl, ta, va]):
            istorija[k].append(v)

        if epohe_bez_poboljsanja >= PATIENCE:
            print(f"\nEarly stopping – nema poboljsanja {PATIENCE} epoha.")
            break

    print(f"\nNajbolja val_loss: {best_val_loss:.4f}")
    model.load_state_dict(torch.load('best_model.pt'))
    return istorija


# ──────────────────────────────────────────
#  Korak 8: Evaluacija
# ──────────────────────────────────────────

def prikazi_istoriju(istorija):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(istorija['train_loss'], label='train')
    ax1.plot(istorija['val_loss'],   label='val')
    ax1.set(title='Loss', xlabel='Epoha', ylabel='Loss')
    ax1.legend(); ax1.grid(alpha=0.3)

    ax2.plot(istorija['train_acc'], label='train')
    ax2.plot(istorija['val_acc'],   label='val')
    ax2.set(title='Accuracy', xlabel='Epoha', ylabel='Accuracy')
    ax2.legend(); ax2.grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig('trening.png', dpi=150)
    plt.show()


def evaluiraj(model, test_loader, klase):
    model.eval()
    predikcije, stvarne = [], []
    with torch.no_grad():
        for X_b, y_b in test_loader:
            predikcije.extend(model(X_b.to(DEVICE)).argmax(1).cpu().numpy())
            stvarne.extend(y_b.numpy())

    print("\n" + "=" * 55)
    print("  REZULTATI NA TEST SKUPU")
    print("=" * 55)
    print(classification_report(stvarne, predikcije, target_names=klase, digits=3))

    cm = confusion_matrix(stvarne, predikcije)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=klase, yticklabels=klase)
    plt.title('Konfuziona matrica – test skup')
    plt.xlabel('Predikcija')
    plt.ylabel('Stvarna klasa')
    plt.tight_layout()
    plt.savefig('konfuziona_matrica.png', dpi=150)
    plt.show()


# ──────────────────────────────────────────
#  Main
# ──────────────────────────────────────────

if __name__ == '__main__':

    print("=== 1. Ucitavanje ===")
    X, labele = ucitaj_dataset()

    print("\n=== 2. Labele ===")
    X, labele = pripremi_labele(X, labele)

    print("\n=== 3. Undersampling ===")
    X, labele = undersample(X, labele, faktor=1)

    le = LabelEncoder()
    y  = le.fit_transform(labele).astype(np.int64)
    print(f"\nKlase: {le.classes_}")

    print("\n=== 4. Podela ===")
    X_train, X_val, X_test, y_train, y_val, y_test = podeli(X, y)

    print("\n=== 5. Loaderi ===")
    train_loader, val_loader, test_loader = napravi_loadere(
        X_train, y_train, X_val, y_val, X_test, y_test)

    brojevi       = np.bincount(y_train)
    tezine        = (1.0 / (brojevi + 1e-6)).astype(np.float32)
    tezine        = tezine / tezine.sum() * len(le.classes_)
    tezine_tensor = torch.FloatTensor(tezine)

    print("\n=== 6. Model ===")
    model = ECG_ResCNN(n_klasa=len(le.classes_)).to(DEVICE)
    print(f"Parametara: {sum(p.numel() for p in model.parameters()):,}")

    print("\n=== 7. Trening ===")
    istorija = treniraj(model, train_loader, val_loader, tezine_tensor)

    print("\n=== 8. Evaluacija ===")
    prikazi_istoriju(istorija)
    evaluiraj(model, test_loader, le.classes_)

    torch.save({'model': model.state_dict(), 'le': le}, 'ecg_model.pt')
    print("\nSacuvano: ecg_model.pt")