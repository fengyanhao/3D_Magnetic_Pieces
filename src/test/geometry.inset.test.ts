import { describe, it, expect } from 'vitest';
import { insetVertices, polygonArea, pointInPolygon, polygonSelfIntersects } from '../utils/geometry';

describe('insetVertices 多边形内缩算法', () => {
  const INSET = 0.06;

  it('正方形（顺时针）内缩后 innerArea < outerArea', () => {
    const squareCW = [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const outerArea = polygonArea(squareCW);
    const innerVerts = insetVertices(squareCW, INSET);
    const innerArea = polygonArea(innerVerts);
    
    expect(innerArea).toBeLessThan(outerArea);
    expect(innerArea).toBeGreaterThan(0);
  });

  it('正方形（逆时针）内缩后 innerArea < outerArea', () => {
    const squareCCW = [
      { x: -0.5, y: -0.5 },
      { x: -0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: -0.5 },
    ];
    
    const outerArea = polygonArea(squareCCW);
    const innerVerts = insetVertices(squareCCW, INSET);
    const innerArea = polygonArea(innerVerts);
    
    expect(innerArea).toBeLessThan(outerArea);
    expect(innerArea).toBeGreaterThan(0);
  });

  it('正方形内缩后无自交', () => {
    const square = [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const innerVerts = insetVertices(square, INSET);
    expect(polygonSelfIntersects(innerVerts)).toBe(false);
  });

  it('正方形内缩后所有内点在外多边形内', () => {
    const square = [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const innerVerts = insetVertices(square, INSET);
    for (const vert of innerVerts) {
      expect(pointInPolygon(vert, square)).toBe(true);
    }
  });

  it('长方形内缩后 innerArea < outerArea', () => {
    const rect = [
      { x: -1, y: -0.5 },
      { x: 1, y: -0.5 },
      { x: 1, y: 0.5 },
      { x: -1, y: 0.5 },
    ];
    
    const outerArea = polygonArea(rect);
    const innerVerts = insetVertices(rect, INSET);
    const innerArea = polygonArea(innerVerts);
    
    expect(innerArea).toBeLessThan(outerArea);
    expect(innerArea).toBeGreaterThan(0);
  });

  it('长方形内缩后无自交', () => {
    const rect = [
      { x: -1, y: -0.5 },
      { x: 1, y: -0.5 },
      { x: 1, y: 0.5 },
      { x: -1, y: 0.5 },
    ];
    
    const innerVerts = insetVertices(rect, INSET);
    expect(polygonSelfIntersects(innerVerts)).toBe(false);
  });

  it('三角形内缩后 innerArea < outerArea', () => {
    const triangle = [
      { x: 0, y: 0.866 },
      { x: -0.5, y: -0.433 },
      { x: 0.5, y: -0.433 },
    ];
    
    const outerArea = polygonArea(triangle);
    const innerVerts = insetVertices(triangle, INSET);
    const innerArea = polygonArea(innerVerts);
    
    expect(innerArea).toBeLessThan(outerArea);
    expect(innerArea).toBeGreaterThan(0);
  });

  it('三角形内缩后无自交', () => {
    const triangle = [
      { x: 0, y: 0.866 },
      { x: -0.5, y: -0.433 },
      { x: 0.5, y: -0.433 },
    ];
    
    const innerVerts = insetVertices(triangle, INSET);
    expect(polygonSelfIntersects(innerVerts)).toBe(false);
  });

  it('梯形内缩后 innerArea < outerArea', () => {
    const trapezoid = [
      { x: -0.8, y: -0.5 },
      { x: 0.8, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const outerArea = polygonArea(trapezoid);
    const innerVerts = insetVertices(trapezoid, INSET);
    const innerArea = polygonArea(innerVerts);
    
    expect(innerArea).toBeLessThan(outerArea);
    expect(innerArea).toBeGreaterThan(0);
  });

  it('梯形内缩后无自交', () => {
    const trapezoid = [
      { x: -0.8, y: -0.5 },
      { x: 0.8, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const innerVerts = insetVertices(trapezoid, INSET);
    expect(polygonSelfIntersects(innerVerts)).toBe(false);
  });

  it('内缩后内多边形边界严格位于外多边形内部', () => {
    const square = [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    
    const innerVerts = insetVertices(square, INSET);
    
    const n = innerVerts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const v1 = innerVerts[i];
      const v2 = innerVerts[j];
      
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;
      
      expect(pointInPolygon({ x: midX, y: midY }, square)).toBe(true);
    }
  });

  it('小内缩量不改变多边形拓扑结构', () => {
    const complexPolygon = [
      { x: 0, y: 1 },
      { x: 0.8, y: 0.6 },
      { x: 0.8, y: -0.6 },
      { x: 0, y: -1 },
      { x: -0.8, y: -0.6 },
      { x: -0.8, y: 0.6 },
    ];
    
    const innerVerts = insetVertices(complexPolygon, INSET);
    expect(innerVerts.length).toBe(complexPolygon.length);
    expect(polygonSelfIntersects(innerVerts)).toBe(false);
    
    const outerArea = polygonArea(complexPolygon);
    const innerArea = polygonArea(innerVerts);
    expect(innerArea).toBeLessThan(outerArea);
  });
});