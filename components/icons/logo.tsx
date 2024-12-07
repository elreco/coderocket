const Logo = ({ className = "", src = "/logo-alternate.png", ...props }) => (
  <img
    className={className}
    {...props}
    src={src}
    alt="Tailwind AI"
    width="32"
    height="32"
  />
);

export default Logo;
