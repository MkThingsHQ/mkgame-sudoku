type CatFaceProps = {
  className?: string;
  muted?: boolean;
};

export function CatFace({ className, muted = false }: CatFaceProps) {
  const classes = ['cat-face', className].filter(Boolean).join(' ');

  return (
    <img
      alt=""
      aria-hidden="true"
      className={classes}
      data-cat-logo="mimodoku-head-v2"
      data-cat-version="head-v2"
      data-muted={muted || undefined}
      draggable={false}
      src="/images/mimodoku-cat-happy.png"
    />
  );
}
