import { useState, useEffect, type ImgHTMLAttributes } from "react";

interface FadeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function FadeImage({ fallback, style, src, onLoad, onError, ...rest }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  if (errored && fallback) return <>{fallback}</>;

  return (
    <img
      {...rest}
      src={src}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.25s ease-in",
      }}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
    />
  );
}
