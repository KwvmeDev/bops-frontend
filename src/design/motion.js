export const easing = {
  enter:  [0.16, 1, 0.3, 1],
  exit:   [0.4, 0, 1, 1],
  inOut:  [0.45, 0, 0.55, 1],
  micro:  [0.2, 0, 0, 1],
  drawer: [0.32, 0.72, 0, 1],
  spring: { damping: 25, stiffness: 250, mass: 1 },
  springSmooth: { damping: 30, stiffness: 200 },
  springBouncy: { damping: 15, stiffness: 300 },
};

export const duration = {
  instant: 0,
  fast:    0.15,
  normal:  0.25,
  slow:    0.35,
  drawer:  0.5,
  page:    0.3,
};

export const variants = {
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25, ease: easing.enter } },
    exit:    { opacity: 0, transition: { duration: 0.15, ease: easing.exit } },
  },
  slideUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easing.enter } },
    exit:    { opacity: 0, y: 8, transition: { duration: 0.15, ease: easing.exit } },
  },
  slideRight: {
    hidden:  { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: easing.enter } },
    exit:    { opacity: 0, x: 16, transition: { duration: 0.15, ease: easing.exit } },
  },
  scale: {
    hidden:  { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 250 } },
    exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: easing.exit } },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.04 } },
  },
};
