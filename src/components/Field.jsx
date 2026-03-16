/**
 * Labelled form field wrapper.
 *
 * @param {string}      label    - Uppercase field label displayed above the input.
 * @param {React.Node}  children - The input or textarea element to render inside.
 * @param {string}      [hint]   - Optional secondary hint text shown beside the label.
 */
export default function Field({ label, children, hint }) {
  return (
    <div>
      <div className="field-label-row">
        <label className="field-label">{label}</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
