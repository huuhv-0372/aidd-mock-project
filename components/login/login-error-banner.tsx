/* Not in the Figma frame: error state from the spec ("Đăng nhập không thành công..."). */
export function LoginErrorBanner({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="max-w-md rounded-lg border border-red-400/60 bg-red-950/70 px-4 py-3 text-base leading-6 font-bold text-red-100"
    >
      {message}
    </div>
  );
}
