export function parseBranchActiveState(value: FormDataEntryValue | null): boolean {
  return String(value) === "true";
}
