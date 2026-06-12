import type { SpellId } from "./spells";
export interface Point {
    x: number;
    y: number;
}
export interface Template {
    name: SpellId;
    points: Point[];
}
export declare class Recognizer {
    templates: Template[];
    constructor();
    private initTemplates;
    private generateCometPoints;
    private generateInfinityPoints;
    normalize(points: Point[]): Point[];
    recognize(points: Point[], restrictToTemplateName?: SpellId): {
        name: SpellId;
        score: number;
    };
    private resample;
    private indicativeAngle;
    private rotateBy;
    private scaleTo;
    private translateTo;
    private distanceAtBestAngle;
    private distanceAtAngle;
    private pathDistance;
    private pathLength;
    private distance;
    private centroid;
    private boundingBox;
}
