import * as THREE from "three";
import { Howl, Howler } from "howler";

const base = import.meta.env.BASE_URL || './'
const A = (file: string) => `${base}audio/${file}`

const position = new THREE.Vector3()
const forward = new THREE.Vector3(0, 0, -1)
const up = new THREE.Vector3(0, 1, 0)
const tmpForward = new THREE.Vector3()
const tmpUp = new THREE.Vector3()
const tmpObjectPos = new THREE.Vector3()
const lastPos = new THREE.Vector3(NaN, NaN, NaN)
const lastForward = new THREE.Vector3(NaN, NaN, NaN)
const lastUp = new THREE.Vector3(NaN, NaN, NaN)
let listenerInitialized = false
const POSITION_EPS = 1e-4
const ORIENTATION_EPS = 1e-4

/** Update the audio listener's position and orientation based on the camera */
export function updateListener(camera: THREE.Camera) {
  if (!camera) return
  if (!(Howler as any).usingWebAudio || !Howler.ctx) return

  camera.getWorldPosition(position)
  tmpForward.copy(forward).applyQuaternion(camera.quaternion).normalize()
  tmpUp.copy(up).applyQuaternion(camera.quaternion).normalize()

  const posChanged = !listenerInitialized || position.distanceToSquared(lastPos) > POSITION_EPS
  if (posChanged) {
    Howler.pos(position.x, position.y, position.z)
    lastPos.copy(position)
  }

  const forwardChanged = !listenerInitialized || tmpForward.distanceToSquared(lastForward) > ORIENTATION_EPS
  const upChanged = !listenerInitialized || tmpUp.distanceToSquared(lastUp) > ORIENTATION_EPS
  if (forwardChanged || upChanged) {
    Howler.orientation(
      tmpForward.x, tmpForward.y, tmpForward.z,
      tmpUp.x, tmpUp.y, tmpUp.z
    )
    lastForward.copy(tmpForward)
    lastUp.copy(tmpUp)
  }

  listenerInitialized = true
}

/** Audio manager class to handle music and sound effects */
export class AudioManager {
  currentMusic: Howl | null = null
  fadeDuration: number = 2000 // ms
  constructor() {
    // set default volume
    Howler.volume(0.5)
  }

  /** Play music track by name */
  playMusic(trackName: keyof typeof music) {
    const track = music[trackName]
    if (!track) return
    if (this.currentMusic === track) return // already playing

    // fade out current music
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, this.fadeDuration)
      setTimeout(() => {
        this.currentMusic?.stop()
      }, this.fadeDuration)
    }
    this.currentMusic = track
    track.volume(0)
    track.play()
    track.fade(0, 1, this.fadeDuration)
  }

  /** Stop current music */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, this.fadeDuration)
      setTimeout(() => {
        this.currentMusic?.stop()
        this.currentMusic = null
      }, this.fadeDuration)
    }
  }

  /** Set global volume (0.0 to 1.0) */
  setVolume(volume: number) {
    Howler.volume(Math.max(0, Math.min(1, volume)))
  }

  /** Get global volume */
  getVolume() {
    return Howler.volume()
  }

  /** Toggle mute */
  toggleMute() {
    Howler.mute(!(Howler as any)._muted)
  }

  /** Check if audio is muted */
  isMuted() {
    return (Howler as any)._muted as boolean
  }

  /** play sound effect by name */
  playTrack(trackName: keyof typeof sounds) {
    return playTrack(trackName)
  }
  
  /** play sound effect at position */
  playTrackAtPosition(trackName: keyof typeof sounds, position: THREE.Vector3) {
    return playTrackAtPosition(trackName, position)
  }
 
  /** Play track at object */
  playTrackAtObject(trackName: keyof typeof sounds, object: THREE.Object3D) {
    return playTrackAtObject(trackName, object)
  }
}

/** Play track by name */
export function playTrack(trackName: keyof typeof sounds) {
  const track = sounds[trackName]
  if (!track) return
  // slight pitch variation
  track.rate(0.9 + Math.random() * 0.3)
  return track.play()
}

/** Play sound at position */
export function playTrackAtPosition(trackName: keyof typeof sounds, position: THREE.Vector3) {
  const track = sounds[trackName]
  if (!track) return
  const usingWebAudio = (Howler as any).usingWebAudio as boolean

  if (typeof track.pos === "function" && usingWebAudio) {
    // slight pitch variation
    track.rate(0.9 + Math.random() * 0.3)
    // play sound at position
    const id = track.play()
    if (typeof id === "number") {
      track.pannerAttr({
        refDistance: 3,
        rolloffFactor: 1.0,
        distanceModel: "inverse",
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0,
        panningModel: "HRTF"
      }, id)
      track.pos(position.x, position.y, position.z, id)
    }
    return id
  }

  // fallback: stereo pan based on x if WebAudio 3D is unavailable
  const x = position.x
  const pan = Math.max(-1, Math.min(1, x / 20))
  track.stereo?.(pan)
  return track.play()
}

/** play sound at object's world position */
export function playTrackAtObject(trackName: keyof typeof sounds, object: THREE.Object3D) {
  object.getWorldPosition(tmpObjectPos)
  return playTrackAtPosition(trackName, tmpObjectPos)
}

// all sounds
export const sounds = {
  button_hover: new Howl({ src: [A('sounds/button_hover.ogg')], volume: 1.0 }),
  button_click: new Howl({ src: [A('sounds/button_click.ogg')], volume: 1.0 }),
}

// all music
export const music = {
  background: new Howl({ src: [A('music/background.ogg')], volume: 0.3, loop: true }),
}
