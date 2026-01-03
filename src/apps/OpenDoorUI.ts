import {NAMESPACE} from "../definitions.js";

/**
 * Toggle the closest normal door (non-locked) roughly in front of the user's controlled token.
 * - If closed -> open
 * - If open -> close
 */
export class OpenDoorUI implements UIModule {
    name = "beavers-open-door";

    async process(userId: string, _userInput: UserInput): Promise<void> {
        try {
            const g = (game as foundry.Game);
            const user = g.users?.get(userId);
            if (!user) return;
            const actor = user.character as Actor | undefined;
            const token = (canvas as any)?.tokens?.controlled?.[0]
                || (canvas as any)?.tokens?.placeables?.find((t: Token) => (t as any).actor?.id === actor?.id);
            if (!token) return;
            const doorWall = this._findDoorInFront(token as any);
            if (!doorWall) return;
            // @ts-ignore Foundry's Wall has a document at runtime even if typings don't declare it
            const doc = (doorWall as Wall).document as any; // WallDocument
            const CONSTS = (foundry as any).CONST ?? (window as any).CONST ?? {};
            const DOOR_STATES = CONSTS.WALL_DOOR_STATES ?? {CLOSED: 0, OPEN: 1, LOCKED: 2};
            const isLocked = doc.ds === DOOR_STATES.LOCKED;
            const isClosed = doc.ds === DOOR_STATES.CLOSED;
            const isDoor = doc.door === 1; // only normal doors (exclude secret)
            if (!isDoor || isLocked) return;

            if (isClosed) {
                // Open the door
                const update = { ds: DOOR_STATES.OPEN };
                await doc.update(update);
            } else if (doc.ds === DOOR_STATES.OPEN) {
                // Close the door
                const update = { ds: DOOR_STATES.CLOSED };
                await doc.update(update);
            }
        } catch (e) {
            console.error(`${NAMESPACE} | OpenDoorUI failed`, e);
        }
    }

    private _findDoorInFront(token: Token): Wall | undefined {
        const walls: Wall[] = (canvas as any)?.walls?.placeables || [];
        if (!walls.length) return undefined;
        const tokenDoc: any = (token as any).document ?? {};
        const center = (token as any).center ?? { x: (token as any).x + (token as any).width / 2, y: (token as any).y + (token as any).height / 2 };
        const rotationDeg = tokenDoc.rotation ?? 0;
        const rotation = (rotationDeg * Math.PI) / 180;
        const dir = { x: -Math.sin(rotation), y: Math.cos(rotation) };

        // Parameters for selection
        const maxDist = ((canvas as any).grid?.size || 100) * 1.5; // ~1.5 grid units

        const lockRotation = !!tokenDoc.lockRotation;
        const coneCos = lockRotation ? -1 : Math.cos((60 * Math.PI) / 180); // if rotation locked: ignore facing

        let best: { w: Wall; d: number } | undefined;
        for (const w of walls) {
            const doc: any = (w as any).document;
            if (doc?.door !== 1) continue; // skip non-normal doors (exclude secret and non-doors)
            const mid = this._midpoint(doc);

            // Require line of sight to the door midpoint
            if (!this._hasLineOfSight(center, mid)) continue;

            const v = { x: mid.x - center.x, y: mid.y - center.y };
            const dist = Math.hypot(v.x, v.y);
            if (dist > maxDist) continue;
            const len = Math.hypot(v.x, v.y) || 1;
            const cosAng = (v.x * dir.x + v.y * dir.y) / len;
            if (cosAng < coneCos) continue; // not in front (unless rotation locked)
            if (!best || dist < best.d) best = { w, d: dist };
        }
        return best?.w;
    }

    private _hasLineOfSight(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
        try {
            const RayCls: any = foundry.canvas.geometry.Ray;
            const ray = new RayCls(from, to);
            const wallsLayer: any = (canvas as any)?.walls;
            if (!wallsLayer?.checkCollision) return true;
            const collision = wallsLayer.checkCollision(ray, { type: "sight" });
            return !collision;
        } catch (_e) {
            // If any error occurs, assume visible to avoid hard failures
            return true;
        }
    }

    private _midpoint(doc: any): { x: number; y: number } {
        // WallDocument has coords [x1,y1,x2,y2]
        const c = doc.c as number[];
        const x = (c[0] + c[2]) / 2;
        const y = (c[1] + c[3]) / 2;
        return { x, y };
    }
}
