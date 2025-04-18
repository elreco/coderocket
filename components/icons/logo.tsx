const Logo = ({ className = "", src = "/logo-alternate.png", ...props }) => (
  <img
    className={className}
    {...props}
    src={src}
    alt="CodeRocket"
    width="34"
    height="34"
  />
);

export default Logo;
