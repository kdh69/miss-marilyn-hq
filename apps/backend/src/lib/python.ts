/** The Python command: python3 on Linux/macOS (and GitHub Actions); Windows only ships `python`. PYTHON overrides. */
export const python = process.env.PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");
