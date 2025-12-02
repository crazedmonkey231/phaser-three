import { io } from "socket.io-client";
import { ITransform } from "../Types";

const SERVER_URL = "http://localhost:3000"; // Replace with your actual server URL
const GAME_ID = "default-game"; // Replace with your actual game ID

export interface IPlayerData {
  name: string;
  transform: ITransform
}

export class MultiplayerManager {
  private socket;
  constructor(roomId: string, playerData: IPlayerData) {
    this.socket = io(SERVER_URL, {
      timeout: 20000,
      query: {
        gameId: GAME_ID,
        roomId: roomId,
        name: playerData.name,
        transform: playerData.transform ? JSON.stringify(playerData.transform) : undefined,
      },
    });
  }

  on(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }

  disconnect() {
    this.socket.disconnect();
  }
}
