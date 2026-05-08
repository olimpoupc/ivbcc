type Props = {
  type: "success" | "error" | "info";
  message: string;
};

export default function AuthFeedback({ type, message }: Props) {
  if (!message) {
    return null;
  }

  const styles =
    type === "error"
      ? "bg-red-50 text-red-700"
      : type === "success"
        ? "bg-green-50 text-green-700"
        : "bg-blue-50 text-blue-700";

  return (
    <p className={`rounded-lg px-4 py-3 text-sm font-medium ${styles}`}>
      {message}
    </p>
  );
}
