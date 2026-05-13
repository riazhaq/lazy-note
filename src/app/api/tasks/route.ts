import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TASKS_FILE = path.join(process.cwd(), "tasks.json");

export async function GET() {
  try {
    const data = await fs.readFile(TASKS_FILE, "utf-8");
    const tasks = JSON.parse(data);
    return NextResponse.json({ tasks });
  } catch (e) {
    // If file doesn't exist, return empty array
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { tasks } = await req.json();
    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: "Invalid tasks format" }, { status: 400 });
    }
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save tasks" }, { status: 500 });
  }
}
