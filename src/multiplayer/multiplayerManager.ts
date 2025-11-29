import { io } from "socket.io-client";
import { ITransform } from "../Types";

const SERVER_URL = "http://localhost:3000"; // Replace with your actual server URL
const GAME_ID = "default-game"; // Replace with your actual game ID
const LEADERBOARD_API_URL = `${SERVER_URL}/api/leaderboard/${GAME_ID}`;

export interface IPlayerData {
  name: string;
  score: number;
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
        score: playerData.score,
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

  async fetchLeaderboard(limit = 10) {
    const res = await fetch(`${LEADERBOARD_API_URL}?limit=${limit}`);
    return await res.json(); // [{ name, score, timestamp }, ...]
  }

  async submitScore(playerName: string, score: number) {
    try {
      const res = await fetch(
        `${LEADERBOARD_API_URL}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: playerName, score }),
        }
      );

      const data = await res.json();
      console.log("submitScore response:", data);
    } catch (err) {
      console.error("submitScore error:", err);
    }
  }
}
