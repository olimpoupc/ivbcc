import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function FormField({ label, id, className = "", ...props }: FormFieldProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <label htmlFor={fieldId} className="form-label">
        {label}
      </label>
      <input
        id={fieldId}
        className={`form-control ${className}`}
        {...props}
      />
    </div>
  );
}
