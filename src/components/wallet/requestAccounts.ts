export async function requestAccounts(): Promise<string[]> {
  if (typeof window === "undefined" || !window.pelagus) {
    throw new Error("Pelagus wallet not found. Please install the Pelagus browser extension.");
  }

  const accounts = (await window.pelagus.request({
    method: "quai_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts returned from Pelagus.");
  }

  return accounts;
}
