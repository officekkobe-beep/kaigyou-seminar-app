// 入力内容をこの端末（localStorage）にだけ一時保存するための共通ユーティリティ。
// iPhone/Safariのプライベートブラウズ等、localStorageへの書き込みが例外を投げる
// 環境でも、その例外を外へ漏らさない。保存に失敗しても画面自体は通常どおり
// 動作し、一時保存の機能だけが静かに無効になる。

const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6時間を超えた下書きは自動的に破棄する

type StoredDraft<T> = {
  savedAt: number;
  data: T;
};

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

// setItem/removeItem を実際に試すことで、localStorage自体は存在するが
// 書き込み時に例外を投げる環境（Safariのプライベートブラウズ等）も検出する。
export function isDraftStorageAvailable(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const testKey = "__draft_storage_test__";
  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// 保存に成功したかどうかを呼び出し側で表示に使えるよう、真偽値で返す。
export function saveDraft<T>(key: string, data: T): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const payload: StoredDraft<T> = { savedAt: Date.now(), data };
    storage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

// 保存時刻が6時間より古い場合は自動的に削除し、nullを返す（復元しない）。
export function loadDraft<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDraft<T>>;
    if (!parsed || typeof parsed.savedAt !== "number" || !("data" in parsed)) {
      storage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed.data as T;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // 削除にも失敗した場合は諦めてよい（画面は壊さない）
    }
    return null;
  }
}

export function clearDraft(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // 失敗しても無視してよい
  }
}
