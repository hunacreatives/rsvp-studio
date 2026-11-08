// Each prop render's frame, in metres (flatlay.py frame_auto(): every prop framed with its whole
// shadow). Props are drawn at true scale from it: width = w × px per metre.
//  ball-shadow: fx/fy = where the ball's centre sits in the shadow frame (fractions).
//  robot-r / robot-l: x0/y1 = the frame's left / top edge from the robot's centre.
export type Frame = { w: number; h: number; x0?: number; y1?: number; fx?: number; fy?: number };
export const FL: Record<string, Frame> = {
  "ball-rest": {"w": 0.1981, "h": 0.2393, "x0": -0.069, "y1": 0.072},
  "ball-shadow": {"w": 0.1981, "h": 0.2393, "fx": 0.3483, "fy": 0.3007},
  "balls-3": {"w": 0.2929, "h": 0.314, "x0": -0.0822, "y1": 0.1569},
  "paddles": {"w": 0.5528, "h": 0.5406, "x0": -0.2416, "y1": 0.2828},
  "paddle-carbon": {"w": 0.3019, "h": 0.5094, "x0": -0.1308, "y1": 0.2496},
  "towel": {"w": 0.543, "h": 0.6711, "x0": -0.1814, "y1": 0.5911},
  "bottle": {"w": 0.3164, "h": 0.4507, "x0": -0.1373, "y1": 0.2035},
  "marker": {"w": 0.1604, "h": 0.2089, "x0": -0.072, "y1": 0.0931},
  "shades": {"w": 0.1943, "h": 0.1425, "x0": -0.0892, "y1": 0.0592},
  "sweatband": {"w": 0.1762, "h": 0.1845, "x0": -0.08, "y1": 0.08},
  "tray": {"w": 0.5101, "h": 0.6452, "x0": -0.225, "y1": 0.225},
  "basket": {"w": 0.7144, "h": 0.8175, "x0": -0.263, "y1": 0.266},
  "robot-r": {"w": 0.5532, "h": 0.5637, "x0": -0.23, "y1": 0.195},
  "robot-l": {"w": 0.5729, "h": 0.5637, "x0": -0.22, "y1": 0.195},
};

export const ASSETS = "/event-templates/flatlay";
export const asset = (name: string) => `${ASSETS}/${name}.webp`;
