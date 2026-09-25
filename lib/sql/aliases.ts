export class AliasAllocator {
  private counter = 0;
  private readonly used = new Set<string>();

  next(prefix = 't'): string {
    let candidate: string;
    do {
      this.counter += 1;
      candidate = `${prefix}${this.counter}`;
    } while (this.used.has(candidate));
    this.used.add(candidate);
    return candidate;
  }
}
