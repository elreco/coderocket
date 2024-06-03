const Logo = ({ className = "", ...props }) => (
  <img
    className={className}
    {...props}
    src="/logo.png"
    alt="Robot"
    width="32"
    height="32"
  />
);

export default Logo;
