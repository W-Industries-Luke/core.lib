import { BreakpointObserver, Breakpoints, type BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, map, type Observable } from 'rxjs';

import { UiBreakpoints } from './breakpoints';

/**
 * A `BreakpointObserver` the test drives directly, one match state per query.
 *
 * jsdom's `matchMedia` never evaluates a query — it answers `false` to everything
 * and its listeners never fire — so the real observer can never be made to report
 * a given screen size. This stands in for it: {@link set} is the resize, and
 * {@link queries} records what was actually observed, so the service is checked to
 * observe the CDK breakpoints it claims to rather than some others.
 *
 * A `BehaviorSubject` per query rather than the one the whole app shares, because
 * this service watches Handset, Tablet and Web independently and each has to move
 * on its own for the transitions to be worth testing.
 */
class FakeBreakpointObserver {
  private readonly subjects = new Map<string, BehaviorSubject<boolean>>();

  /** Every query passed to `observe`, in subscription order. */
  readonly queries: (string | readonly string[])[] = [];

  private key(query: string | readonly string[]): string {
    return Array.isArray(query) ? [...query].join(',') : (query as string);
  }

  private subjectFor(query: string | readonly string[]): BehaviorSubject<boolean> {
    const key = this.key(query);
    let subject = this.subjects.get(key);
    if (!subject) {
      subject = new BehaviorSubject(false);
      this.subjects.set(key, subject);
    }
    return subject;
  }

  /** Drive a query's match state, the way a resize past it would. */
  set(query: string | readonly string[], matches: boolean): void {
    this.subjectFor(query).next(matches);
  }

  observe(query: string | readonly string[]): Observable<BreakpointState> {
    this.queries.push(query);
    return this.subjectFor(query).pipe(map((matches) => ({ matches, breakpoints: {} })));
  }

  isMatched(query: string | readonly string[]): boolean {
    return this.subjectFor(query).value;
  }
}

describe('UiBreakpoints', () => {
  let observer: FakeBreakpointObserver;
  let breakpoints: UiBreakpoints;

  /** Builds the service against the fake — after any `set` that has to precede it. */
  const create = (): UiBreakpoints => {
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: observer }],
    });
    return TestBed.inject(UiBreakpoints);
  };

  beforeEach(() => {
    observer = new FakeBreakpointObserver();
  });

  describe('device signals', () => {
    beforeEach(() => {
      breakpoints = create();
    });

    // The three device signals are the point of the service, so each is checked to
    // track its own CDK breakpoint and nothing else.
    it('observes CDK’s Handset, Tablet and Web breakpoints', () => {
      expect(observer.queries).toEqual(
        expect.arrayContaining([Breakpoints.Handset, Breakpoints.Tablet, Breakpoints.Web]),
      );
    });

    it('starts with every device signal false when nothing matches', () => {
      expect(breakpoints.handset()).toBe(false);
      expect(breakpoints.tablet()).toBe(false);
      expect(breakpoints.web()).toBe(false);
    });

    it('turns handset on and off as its query matches and stops matching', () => {
      observer.set(Breakpoints.Handset, true);
      expect(breakpoints.handset()).toBe(true);
      expect(breakpoints.tablet()).toBe(false);

      observer.set(Breakpoints.Handset, false);
      expect(breakpoints.handset()).toBe(false);
    });

    // The three are independent subscriptions, so moving one must not disturb the
    // others — a resize from phone to tablet flips exactly two signals.
    it('tracks each device class independently', () => {
      observer.set(Breakpoints.Handset, true);
      expect(breakpoints.handset()).toBe(true);

      observer.set(Breakpoints.Handset, false);
      observer.set(Breakpoints.Tablet, true);
      expect(breakpoints.handset()).toBe(false);
      expect(breakpoints.tablet()).toBe(true);
      expect(breakpoints.web()).toBe(false);

      observer.set(Breakpoints.Tablet, false);
      observer.set(Breakpoints.Web, true);
      expect(breakpoints.tablet()).toBe(false);
      expect(breakpoints.web()).toBe(true);
    });
  });

  describe('active', () => {
    beforeEach(() => {
      breakpoints = create();
    });

    // Mobile-first: with nothing matched yet (the CDK is still evaluating on first
    // paint) the app should lay out for the smallest screen, not the largest.
    it('falls back to handset when nothing matches', () => {
      expect(breakpoints.active()).toBe('handset');
    });

    it('follows the matching device class', () => {
      observer.set(Breakpoints.Handset, true);
      expect(breakpoints.active()).toBe('handset');

      observer.set(Breakpoints.Handset, false);
      observer.set(Breakpoints.Tablet, true);
      expect(breakpoints.active()).toBe('tablet');

      observer.set(Breakpoints.Tablet, false);
      observer.set(Breakpoints.Web, true);
      expect(breakpoints.active()).toBe('web');
    });

    // The CDK's queries leave fraction-of-a-pixel gaps between buckets where two can
    // momentarily overlap; the wider one wins so `active` can only ever resolve down
    // to `handset`, never flicker up to it from a larger screen.
    it('prefers the wider class when two overlap', () => {
      observer.set(Breakpoints.Tablet, true);
      observer.set(Breakpoints.Web, true);
      expect(breakpoints.active()).toBe('web');

      observer.set(Breakpoints.Web, false);
      observer.set(Breakpoints.Handset, true);
      expect(breakpoints.active()).toBe('tablet');
    });
  });

  describe('initial value', () => {
    // `toSignal` needs a value before its observable first emits. `isMatched` supplies
    // the true current state, so a service created on a screen that already matches
    // reports it from the very first read rather than a stale `false` for one tick.
    it('reports a breakpoint already matched at construction', () => {
      observer.set(Breakpoints.Web, true);
      breakpoints = create();

      expect(breakpoints.web()).toBe(true);
      expect(breakpoints.active()).toBe('web');
    });
  });

  describe('observe', () => {
    beforeEach(() => {
      breakpoints = create();
    });

    it('returns a signal that tracks a custom query', () => {
      const wide = breakpoints.observe('(min-width: 1600px)');
      expect(observer.queries).toContain('(min-width: 1600px)');
      expect(wide()).toBe(false);

      observer.set('(min-width: 1600px)', true);
      expect(wide()).toBe(true);
    });

    it('accepts an array of queries', () => {
      const query = [Breakpoints.HandsetPortrait, Breakpoints.TabletPortrait];
      const portrait = breakpoints.observe(query);

      observer.set(query, true);
      expect(portrait()).toBe(true);
    });

    it('seeds the signal from the query’s current state', () => {
      observer.set('(orientation: portrait)', true);
      expect(breakpoints.observe('(orientation: portrait)')()).toBe(true);
    });
  });

  // The escape hatch: the observer underneath is the same instance the service
  // subscribes to, so a consumer reaching past the wrapper for `isMatched(...)` is
  // not talking to a second, unrelated observer.
  it('exposes the BreakpointObserver it delegates to', () => {
    breakpoints = create();
    expect(breakpoints.breakpointObserver).toBe(TestBed.inject(BreakpointObserver));
  });
});
