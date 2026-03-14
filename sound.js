class Sound {
    constructor(engine, url) {
	this.engine = engine;
	this.context = engine.context;
	this.url = url;

	this.buffer = null;
	this.source = null;
	this.isPlaying = false;
	this.isLooping = false;

	this._playPromise = null;
	this._resolve = null;
	this._reject = null;

	// === Per-sound nodes ===
	this.outputGain = this.context.createGain();
	this.outputGain.gain.value = 1.0;

	this.reverbSendGain = this.context.createGain();
	this.reverbSendGain.gain.value = 0.2; // default wet amount

	this.panner = this.context.createPanner();
	this._configurePanner();

	// Wiring (permanent)
	this.panner.connect(this.outputGain);
	this.outputGain.connect(this.engine.dryBus);

	this.outputGain.connect(this.reverbSendGain);
	this.reverbSendGain.connect(this.engine.reverbBus);

	// Start loading immediately
	this.ready = this._loadBuffer();
	if (window.readyFunctions) {
	    readyFunctions.push(this.ready);
	}
        if (window.allSounds) {
            window.allSounds.push(this);
        }
    }

    async _loadBuffer() {
	const response = await fetch(this.url);
	if (!response.ok) throw new Error(`Failed to load: ${this.url}`);
	const arrayBuffer = await response.arrayBuffer();
	this.buffer = await this.context.decodeAudioData(arrayBuffer);
    }

    _configurePanner() {
	this.panner.panningModel = "HRTF";
	this.panner.distanceModel = "exponential";

	this.panner.refDistance = 2;
	//this.panner.maxDistance = 10;
	this.panner.rolloffFactor = 3;
        /*;
	this.panner.coneInnerAngle = 360;
	this.panner.coneOuterAngle = 0;
	this.panner.coneOuterGain = 0;
        */
    }

    setPosition(x, y, z) {
	this.panner.positionX.value = x;
	this.panner.positionY.value = y;
	this.panner.positionZ.value = z;
    }

    setReverbAmount(amount) {
	this.reverbSendGain.gain.value = amount;
    }

    setVolume(volume) {
	this._volume = volume;
	this.outputGain.gain.value = this._volume;
    }

    _createSource(loop = false) {
	const source = this.context.createBufferSource();
	source.buffer = this.buffer;
	source.loop = loop;
	source.connect(this.panner);

	source.onended = () => {
	    if (!this.isLooping) {
		this.isPlaying = false;
		this.source = null;
	    }
	};

	return source;
    }

    fadeInAtOffset(loop, offset, fadeInTime) {
        this._start(loop, this.context.currentTime, offset, fadeInTime);
    }

    play() {
	if (this.isPlaying) return this._playPromise;

	this.isLooping = false;
	return this._start(false);
    }

    loop() {
	if (this.isPlaying) return this._playPromise;

	this.isLooping = true;
	return this._start(true);
    }

    playAt(when) {
	if (this.isPlaying) return;
	this.isLooping = false;
	return this._start(false, when);
    }

    _cleanupPromise() {
	this._playPromise = null;
	this._resolve = null;
	this._reject = null;
    }

    _start(loop, when = this.context.currentTime, offset = 0.0, fadeInTime = 0.0) {
	if (!this.buffer) {
	    return Promise.reject(new Error("Sound not loaded"));
	}

	this.source = this._createSource(loop);

	this._playPromise = new Promise((resolve, reject) => {
	    this._resolve = resolve;
	    this._reject = reject;
	});

        if (fadeInTime > 0) {
            const gain = this.outputGain.gain.value;
	    const now = this.context.currentTime;
	    this.outputGain.gain.cancelScheduledValues(now);
	    this.outputGain.gain.setValueAtTime(0, now);
	    this.outputGain.gain.linearRampToValueAtTime(gain, now + fadeInTime);
        }

	this.source.onended = () => {
	    // If looping, ignore natural end (shouldn't happen unless stopped)
	    if (this.isLooping) return;

	    this.isPlaying = false;
	    this.source.disconnect();
	    this.source = null;

	    if (this._resolve) {
		this._resolve();
	    }

	    this._cleanupPromise();
	};

	this.source.start(when, offset);
	this.isPlaying = true;

	return this._playPromise;
    }

    stop(fadeTime = 0.1) {
	if (!this.isPlaying || !this.source) return; // idempotent

	const now = this.context.currentTime;

	// Fade out smoothly to avoid click
	this.outputGain.gain.cancelScheduledValues(now);
	this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, now);
	this.outputGain.gain.linearRampToValueAtTime(0, now + fadeTime);

	this.source.stop(now + fadeTime);

	this.source.onended = () => {
	    this.isPlaying = false;
	    this.source.disconnect();
	    this.source = null;

	    // restore gain
	    this.outputGain.gain.setValueAtTime(this._volume, now + fadeTime);
	};
    }
}
