// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<Args extends any[]>(
  fn: (...args: Args) => void,
  delay = 100,
) {
  if (delay === 0) {
    return fn;
  }

  let timer: number | undefined;

  return function <U>(this: U, ...args: Args) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;

    clearTimeout(timer);

    timer = window.setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}
