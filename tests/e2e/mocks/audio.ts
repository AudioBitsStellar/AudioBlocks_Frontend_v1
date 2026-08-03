type MockAudio = HTMLAudioElement & {
  _mockCalls: {
    play: boolean;
    pause: boolean;
    currentTime: number;
  };
  _listeners: Record<string, Set<EventListener>>;
  _currentTime: number;
  _duration: number;
  _paused: boolean;
  _src: string;
  _resolvePlay?: () => void;
};

const audios = new Map<number, MockAudio>();
let nextId = 0;

export function createMockAudio(): MockAudio {
  const id = nextId++;
  const audio = {
    _mockCalls: { play: false, pause: false, currentTime: 0 },
    _listeners: {},
    _currentTime: 0,
    _duration: 180,
    _paused: true,
    _src: '',
    _resolvePlay: undefined,

    addEventListener(type: string, listener: EventListener) {
      if (!this._listeners[type]) this._listeners[type] = new Set();
      this._listeners[type].add(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      this._listeners[type]?.delete(listener);
    },
    dispatchEvent(event: Event) {
      this._listeners[event.type]?.forEach((l) => l(event));
    },

    play() {
      this._mockCalls.play = true;
      this._paused = false;
      if (this._resolvePlay) {
        this._resolvePlay();
        this._resolvePlay = undefined;
      }
      return Promise.resolve();
    },
    pause() {
      this._mockCalls.pause = true;
      this._paused = true;
    },
    load() {},
    cloneNode() {
      return this as unknown as Node;
    },

    get currentTime() {
      return this._currentTime;
    },
    set currentTime(v: number) {
      this._currentTime = v;
      this._mockCalls.currentTime = v;
    },
    get duration() {
      return this._duration;
    },
    set duration(v: number) {
      this._duration = v;
    },
    get paused() {
      return this._paused;
    },
    set paused(v: boolean) {
      this._paused = v;
    },
    get src() {
      return this._src;
    },
    set src(v: string) {
      this._src = v;
      this._currentTime = 0;
    },
    get readyState() {
      return 4;
    },
    get networkState() {
      return 1;
    },
    get ended() {
      return false;
    },
    get error() {
      return null;
    },
    get volume() {
      return 1;
    },
    set volume(_v: number) {},
    get muted() {
      return false;
    },
    set muted(_v: boolean) {},
    get playbackRate() {
      return 1;
    },
    set playbackRate(_v: number) {},
    get currentSrc() {
      return this._src;
    },
  } as unknown as MockAudio;

  audios.set(id, audio);
  return audio;
}

export function getMockAudio(id = 0): MockAudio | undefined {
  return audios.get(id);
}
