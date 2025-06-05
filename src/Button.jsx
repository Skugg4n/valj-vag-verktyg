export default function Button({ variant = 'ghost', icon: Icon, className = '', children, ...props }) {
  return (
    <button className={`btn ${variant} ${className}`.trim()} {...props}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  )
}
