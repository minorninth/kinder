class AudioEngine {
    constructor({ impulseUrl }) {
	this.context = new (window.AudioContext || window.webkitAudioContext)();

	// === MASTER ===
	this.masterGain = this.context.createGain();
	this.masterGain.gain.value = 1.0;

	// === DRY BUS ===
	this.dryBus = this.context.createGain();
	this.dryBus.gain.value = 1.0;

	// === REVERB BUS ===
	this.reverbBus = this.context.createGain();
	this.reverbBus.gain.value = 1.0;

	this.convolver = this.context.createConvolver();

	// === Wiring ===
	this.dryBus.connect(this.masterGain);

	this.reverbBus.connect(this.convolver);
	this.convolver.connect(this.masterGain);

	this.masterGain.connect(this.context.destination);

	// === Listener defaults ===
	const listener = this.context.listener;
	listener.positionX.value = 0;
	listener.positionY.value = 0;
	listener.positionZ.value = 0;

	listener.forwardX.value = 0;
	listener.forwardY.value = 0;
	listener.forwardZ.value = -1;

	listener.upX.value = 0;
	listener.upY.value = 1;
	listener.upZ.value = 0;

	// === Load impulse response ===
	this.ready = this._loadImpulse(impulseUrl);
    }

    async _loadImpulse(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to load IR: ${url}`);
	const arrayBuffer = await response.arrayBuffer();
	const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
	this.convolver.buffer = audioBuffer;
    }

    async resume() {
	if (this.context.state === 'suspended') {
	    await this.context.resume();
	}
    }
}
