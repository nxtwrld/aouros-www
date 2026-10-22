import { writable, type Writable } from 'svelte/store';

export interface ScrollObserver {
	activeSection: Writable<number>;
	progress: Writable<number>;
	observe(elements: HTMLElement[], scrollContainer: HTMLElement): void;
	destroy(): void;
}

const SNAP_DURATION_MS = 450;
const GESTURE_GAP_MS = 120;
// Fraction of the viewport the page must be pulled past a section edge to commit
const COMMIT_THRESHOLD = 0.2;
// Release speed (px/ms) that commits even below the distance threshold
const FLICK_VELOCITY = 0.5;
const TOUCH_SLOP_PX = 8;
const VELOCITY_WINDOW_MS = 100;
// Mouse wheels send large integer steps; trackpads send small fractional deltas
const DISCRETE_WHEEL_MIN = 50;

export function createScrollObserver(): ScrollObserver {
	const activeSection = writable(0);
	const progress = writable(0);
	let elements: HTMLElement[] = [];
	let container: HTMLElement | null = null;
	let currentSection = 0;

	// Snap animation
	let animFrame: number | null = null;

	// Drag state shared by wheel and touch.
	// The page follows the input 1:1 and on release either commits to the
	// neighbouring section or springs back.
	let dragging = false;
	let dragOrigin = 0;
	let dragSection = 0;
	let dragOffset = 0;

	// Wheel gesture: continuous stream of wheel events, ends after GESTURE_GAP_MS of silence
	let gestureHandled = false;
	let gestureTimer: ReturnType<typeof setTimeout> | null = null;

	// Touch gesture
	let touchActive = false;
	let touchHorizontal = false;
	let touchStartX = 0;
	let touchStartY = 0;
	let touchSamples: { t: number; y: number }[] = [];

	function setSection(index: number) {
		currentSection = index;
		activeSection.set(index);
		progress.set(index / Math.max(elements.length - 1, 1));
	}

	function maxScroll(): number {
		return container ? container.scrollHeight - container.clientHeight : 0;
	}

	function clamp(v: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, v));
	}

	/** Scroll position where section `i` sits top-aligned */
	function startStop(i: number): number {
		return clamp(elements[i].offsetTop, 0, maxScroll());
	}

	/** Scroll position where section `i` sits bottom-aligned (equals startStop for viewport-height sections) */
	function endStop(i: number): number {
		if (!container) return 0;
		if (i === elements.length - 1) return maxScroll();
		const el = elements[i];
		const end = el.offsetTop + Math.max(0, el.offsetHeight - container.clientHeight);
		return clamp(end, 0, maxScroll());
	}

	/** Section whose free range contains the given scroll position */
	function sectionAt(top: number): number {
		let idx = 0;
		for (let i = 0; i < elements.length; i++) {
			if (elements[i].offsetTop <= top + 1) idx = i;
		}
		return idx;
	}

	function setScrollTop(top: number) {
		container?.scrollTo({ top, behavior: 'instant' });
	}

	function cancelAnimation() {
		if (animFrame !== null) {
			cancelAnimationFrame(animFrame);
			animFrame = null;
		}
	}

	function animateTo(target: number) {
		if (!container) return;
		cancelAnimation();
		const from = container.scrollTop;
		const distance = target - from;
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (Math.abs(distance) < 1 || reduceMotion) {
			setScrollTop(target);
			return;
		}

		const start = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / SNAP_DURATION_MS);
			const eased = 1 - Math.pow(1 - t, 3);
			setScrollTop(from + distance * eased);
			animFrame = t < 1 ? requestAnimationFrame(step) : null;
		};
		animFrame = requestAnimationFrame(step);
	}

	function navigateTo(index: number, direction: number) {
		if (index < 0 || index >= elements.length) return;
		setSection(index);
		animateTo(direction > 0 ? startStop(index) : endStop(index));
	}

	function beginDrag() {
		if (!container) return;
		// Mid-snap the target section is already committed; otherwise derive it from position
		dragSection = animFrame !== null ? currentSection : sectionAt(container.scrollTop);
		cancelAnimation();
		dragging = true;
		dragOrigin = container.scrollTop;
		dragOffset = 0;
	}

	function applyDrag() {
		const min = dragSection > 0 ? endStop(dragSection - 1) : 0;
		const max = dragSection < elements.length - 1 ? startStop(dragSection + 1) : maxScroll();
		setScrollTop(clamp(dragOrigin + dragOffset, min, max));
	}

	/** Distance pulled past the current section's free range: negative = up, positive = down */
	function overshoot(): number {
		if (!container) return 0;
		const top = container.scrollTop;
		const start = startStop(dragSection);
		const end = endStop(dragSection);
		if (top < start) return top - start;
		if (top > end) return top - end;
		return 0;
	}

	function endDrag(velocity: number) {
		if (!dragging || !container) return;
		dragging = false;

		const pulled = overshoot();
		// Inside a tall section's free range — stay where the user left it
		// shortcut: no momentum when touch-scrolling inside a tall section, add inertia if long sections feel sticky on phones
		if (pulled === 0) {
			if (dragSection !== currentSection) setSection(dragSection);
			return;
		}

		const direction = Math.sign(pulled);
		const next = dragSection + direction;
		const pastThreshold = Math.abs(pulled) > container.clientHeight * COMMIT_THRESHOLD;
		const flicked = velocity * direction > FLICK_VELOCITY;

		if ((pastThreshold || flicked) && next >= 0 && next < elements.length) {
			navigateTo(next, direction);
		} else {
			animateTo(direction > 0 ? endStop(dragSection) : startStop(dragSection));
		}
	}

	function wheelDelta(e: WheelEvent): number {
		if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * 16;
		if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * (container?.clientHeight ?? 0);
		return e.deltaY;
	}

	function isDiscreteWheel(e: WheelEvent): boolean {
		return (
			e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
			(Math.abs(e.deltaY) >= DISCRETE_WHEEL_MIN && Number.isInteger(e.deltaY))
		);
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		if (!container) return;

		// Reset gesture end timer — gesture is still active
		if (gestureTimer) clearTimeout(gestureTimer);
		gestureTimer = setTimeout(() => {
			gestureTimer = null;
			gestureHandled = false;
			endDrag(0);
		}, GESTURE_GAP_MS);

		// Already committed this gesture — swallow the rest (trackpad inertia)
		if (gestureHandled) return;

		const delta = wheelDelta(e);
		if (delta === 0) return;

		if (!dragging && isDiscreteWheel(e)) {
			// Mouse wheel: one notch = one page, unless scrolling inside a tall section
			const section = animFrame !== null ? currentSection : sectionAt(container.scrollTop);
			const direction = Math.sign(delta);
			const top = container.scrollTop;
			const end = endStop(section);
			const start = startStop(section);
			if ((direction > 0 && top < end - 1) || (direction < 0 && top > start + 1)) {
				cancelAnimation();
				setScrollTop(clamp(top + delta, start, end));
				return;
			}
			gestureHandled = true;
			navigateTo(section + direction, direction);
			return;
		}

		if (!dragging) beginDrag();
		dragOffset += delta;
		applyDrag();

		// Trackpad: commit as soon as the threshold is crossed instead of waiting for inertia to die out
		if (Math.abs(overshoot()) > container.clientHeight * COMMIT_THRESHOLD) {
			gestureHandled = true;
			endDrag(0);
		}
	}

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) {
			touchActive = false;
			return;
		}
		const touch = e.touches[0];
		touchActive = true;
		touchHorizontal = false;
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchSamples = [{ t: e.timeStamp, y: touch.clientY }];
	}

	function onTouchMove(e: TouchEvent) {
		if (!touchActive || e.touches.length !== 1) return;
		// Must cancel from the first move, otherwise the browser starts native scrolling
		// and later touchmove events become non-cancelable
		e.preventDefault();
		if (touchHorizontal) return;

		const touch = e.touches[0];
		const dx = touch.clientX - touchStartX;
		const dy = touchStartY - touch.clientY;

		if (!dragging) {
			if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TOUCH_SLOP_PX) {
				touchHorizontal = true;
				return;
			}
			if (Math.abs(dy) < TOUCH_SLOP_PX) return;
			beginDrag();
		}

		touchSamples.push({ t: e.timeStamp, y: touch.clientY });
		while (touchSamples.length > 2 && e.timeStamp - touchSamples[0].t > VELOCITY_WINDOW_MS) {
			touchSamples.shift();
		}

		dragOffset = dy;
		applyDrag();
	}

	function onTouchEnd() {
		if (!touchActive) return;
		touchActive = false;
		if (!dragging) return;

		const first = touchSamples[0];
		const last = touchSamples[touchSamples.length - 1];
		const dt = last.t - first.t;
		// Positive = finger moving up = scrolling down
		const velocity = dt > 0 ? (first.y - last.y) / dt : 0;
		endDrag(velocity);
	}

	function onScroll() {
		// Only update from native scroll if not driven by our drag/snap
		// This handles dot navigation and keyboard scrolling
		if (dragging || animFrame !== null || !container || elements.length === 0) return;

		const closestIdx = findClosestSection();
		if (closestIdx !== currentSection) {
			setSection(closestIdx);
		}
	}

	function findClosestSection(): number {
		if (!container || elements.length === 0) return 0;

		const scrollTop = container.scrollTop;
		const viewportH = container.clientHeight;
		const center = scrollTop + viewportH / 2;

		let closestIdx = 0;
		let closestDist = Infinity;

		for (let i = 0; i < elements.length; i++) {
			const el = elements[i];
			const elCenter = el.offsetTop + el.offsetHeight / 2;
			const dist = Math.abs(center - elCenter);
			if (dist < closestDist) {
				closestDist = dist;
				closestIdx = i;
			}
		}

		return closestIdx;
	}

	function observe(els: HTMLElement[], scrollContainer: HTMLElement) {
		destroy();
		elements = els;
		container = scrollContainer;
		container.addEventListener('wheel', onWheel, { passive: false });
		container.addEventListener('scroll', onScroll, { passive: true });
		container.addEventListener('touchstart', onTouchStart, { passive: true });
		container.addEventListener('touchmove', onTouchMove, { passive: false });
		container.addEventListener('touchend', onTouchEnd);
		container.addEventListener('touchcancel', onTouchEnd);

		// Sync initial state
		currentSection = findClosestSection();
		activeSection.set(currentSection);
		progress.set(currentSection / Math.max(elements.length - 1, 1));
	}

	function destroy() {
		if (container) {
			container.removeEventListener('wheel', onWheel);
			container.removeEventListener('scroll', onScroll);
			container.removeEventListener('touchstart', onTouchStart);
			container.removeEventListener('touchmove', onTouchMove);
			container.removeEventListener('touchend', onTouchEnd);
			container.removeEventListener('touchcancel', onTouchEnd);
			container = null;
		}
		cancelAnimation();
		if (gestureTimer) clearTimeout(gestureTimer);
		gestureTimer = null;
		gestureHandled = false;
		dragging = false;
		touchActive = false;
		elements = [];
	}

	return { activeSection, progress, observe, destroy };
}
