import { describe, it, expect } from 'vitest';
import {
  squareShape,
  rectangleShape,
  equilateralTriangleShape,
  isoscelesTriangleShape,
  rightTriangleShape,
  longRightTriangleShape,
  rhombusShape,
  trapezoidShape,
  pentagonShape,
  hexagonShape,
  sectorShape,
  semicircleShape,
} from '../engine/shapes';

describe('形状定义测试', () => {
  it('正方形形状定义正确', () => {
    expect(squareShape.id).toBe('square');
    expect(squareShape.vertices.length).toBe(4);
    expect(squareShape.edges.length).toBe(4);
    expect(squareShape.ports.length).toBe(4);
  });

  it('长方形形状定义正确', () => {
    expect(rectangleShape.id).toBe('rectangle');
    expect(rectangleShape.vertices.length).toBe(4);
    expect(rectangleShape.edges.length).toBe(4);
    expect(rectangleShape.ports.length).toBe(6);
  });

  it('等边三角形形状定义正确', () => {
    expect(equilateralTriangleShape.id).toBe('equilateral-triangle');
    expect(equilateralTriangleShape.vertices.length).toBe(3);
    expect(equilateralTriangleShape.edges.length).toBe(3);
    expect(equilateralTriangleShape.ports.length).toBe(3);
  });

  it('等腰三角形形状定义正确', () => {
    expect(isoscelesTriangleShape.id).toBe('isosceles-triangle');
    expect(isoscelesTriangleShape.vertices.length).toBe(3);
    expect(isoscelesTriangleShape.edges.length).toBe(3);
    expect(isoscelesTriangleShape.ports.length).toBe(3);
  });

  it('直角三角形形状定义正确（新增）', () => {
    expect(rightTriangleShape.id).toBe('right-triangle');
    expect(rightTriangleShape.vertices.length).toBe(3);
    expect(rightTriangleShape.edges.length).toBe(3);
    expect(rightTriangleShape.ports.length).toBe(3);
  });

  it('长直角三角形形状定义正确（新增）', () => {
    expect(longRightTriangleShape.id).toBe('long-right-triangle');
    expect(longRightTriangleShape.vertices.length).toBe(3);
    expect(longRightTriangleShape.edges.length).toBe(3);
    expect(longRightTriangleShape.ports.length).toBe(3);
  });

  it('菱形形状定义正确', () => {
    expect(rhombusShape.id).toBe('rhombus');
    expect(rhombusShape.vertices.length).toBe(4);
    expect(rhombusShape.edges.length).toBe(4);
    expect(rhombusShape.ports.length).toBe(4);
  });

  it('梯形形状定义正确', () => {
    expect(trapezoidShape.id).toBe('trapezoid');
    expect(trapezoidShape.vertices.length).toBe(4);
    expect(trapezoidShape.edges.length).toBe(4);
    expect(trapezoidShape.ports.length).toBe(4);
  });

  it('五边形形状定义正确', () => {
    expect(pentagonShape.id).toBe('pentagon');
    expect(pentagonShape.vertices.length).toBe(5);
    expect(pentagonShape.edges.length).toBe(5);
    expect(pentagonShape.ports.length).toBe(5);
  });

  it('六边形形状定义正确', () => {
    expect(hexagonShape.id).toBe('hexagon');
    expect(hexagonShape.vertices.length).toBe(6);
    expect(hexagonShape.edges.length).toBe(6);
    expect(hexagonShape.ports.length).toBe(6);
  });

  it('扇形形状定义正确（修复）', () => {
    expect(sectorShape.id).toBe('sector');
    expect(sectorShape.vertices.length).toBe(3);
    expect(sectorShape.edges.length).toBe(3);
    expect(sectorShape.ports.length).toBe(2);
    expect(sectorShape.edges.some(e => e.isCurved)).toBe(true);
  });

  it('半圆形状定义正确（新增）', () => {
    expect(semicircleShape.id).toBe('semicircle');
    expect(semicircleShape.vertices.length).toBe(2);
    expect(semicircleShape.edges.length).toBe(2);
    expect(semicircleShape.ports.length).toBe(1);
    expect(semicircleShape.edges.some(e => e.isCurved)).toBe(true);
  });
});

describe('形状端口数量与位置测试', () => {
  it('正方形每边一个端口', () => {
    const edgesWithPorts = squareShape.edges.filter(e => 
      squareShape.ports.some(p => p.edgeId === e.edgeId)
    );
    expect(edgesWithPorts.length).toBe(4);
  });

  it('长方形每边一个端口', () => {
    const edgesWithPorts = rectangleShape.edges.filter(e => 
      rectangleShape.ports.some(p => p.edgeId === e.edgeId)
    );
    expect(edgesWithPorts.length).toBe(4);
  });

  it('扇形只有直边有端口，曲边无端口', () => {
    const straightEdges = sectorShape.edges.filter(e => !e.isCurved);
    const curvedEdges = sectorShape.edges.filter(e => e.isCurved);
    
    const straightEdgesWithPorts = straightEdges.filter(e => 
      sectorShape.ports.some(p => p.edgeId === e.edgeId)
    );
    const curvedEdgesWithPorts = curvedEdges.filter(e => 
      sectorShape.ports.some(p => p.edgeId === e.edgeId)
    );

    expect(straightEdgesWithPorts.length).toBe(straightEdges.length);
    expect(curvedEdgesWithPorts.length).toBe(0);
  });

  it('半圆只有直边有端口，曲边无端口', () => {
    const straightEdges = semicircleShape.edges.filter(e => !e.isCurved);
    const curvedEdges = semicircleShape.edges.filter(e => e.isCurved);
    
    const straightEdgesWithPorts = straightEdges.filter(e => 
      semicircleShape.ports.some(p => p.edgeId === e.edgeId)
    );
    const curvedEdgesWithPorts = curvedEdges.filter(e => 
      semicircleShape.ports.some(p => p.edgeId === e.edgeId)
    );

    expect(straightEdgesWithPorts.length).toBe(straightEdges.length);
    expect(curvedEdgesWithPorts.length).toBe(0);
  });
});

describe('形状面积测试', () => {
  it('正方形面积约为1', () => {
    const area = squareShape.area;
    expect(Math.abs(area - 1)).toBeLessThan(0.1);
  });

  it('长方形面积约为2', () => {
    const area = rectangleShape.area;
    expect(Math.abs(area - 2)).toBeLessThan(0.1);
  });

  it('等边三角形面积约为0.433', () => {
    const area = equilateralTriangleShape.area;
    expect(Math.abs(area - 0.433)).toBeLessThan(0.1);
  });

  it('直角三角形面积约为0.5', () => {
    const area = rightTriangleShape.area;
    expect(Math.abs(area - 0.5)).toBeLessThan(0.1);
  });

  it('长直角三角形面积约为1', () => {
    const area = longRightTriangleShape.area;
    expect(Math.abs(area - 1)).toBeLessThan(0.1);
  });

  it('半圆面积约为0.3927', () => {
    const expectedArea = Math.PI * 0.25 / 2;
    const area = semicircleShape.area;
    expect(Math.abs(area - expectedArea)).toBeLessThan(0.1);
  });
});

describe('曲边形状轮廓测试', () => {
  it('扇形包含曲边', () => {
    const hasCurvedEdge = sectorShape.edges.some(e => e.isCurved);
    expect(hasCurvedEdge).toBe(true);
  });

  it('半圆包含曲边', () => {
    const hasCurvedEdge = semicircleShape.edges.some(e => e.isCurved);
    expect(hasCurvedEdge).toBe(true);
  });

  it('扇形曲边有正确的圆心和半径', () => {
    const curvedEdge = sectorShape.edges.find(e => e.isCurved);
    expect(curvedEdge).toBeDefined();
    expect(curvedEdge!.center).toBeDefined();
    expect(curvedEdge!.radius).toBeGreaterThan(0);
  });

  it('半圆曲边有正确的圆心和半径', () => {
    const curvedEdge = semicircleShape.edges.find(e => e.isCurved);
    expect(curvedEdge).toBeDefined();
    expect(curvedEdge!.center).toBeDefined();
    expect(curvedEdge!.radius).toBeGreaterThan(0);
  });
});

describe('形状ID一致性测试', () => {
  const expectedShapeIds = [
    'square',
    'rectangle',
    'equilateral-triangle',
    'isosceles-triangle',
    'right-triangle',
    'long-right-triangle',
    'rhombus',
    'trapezoid',
    'pentagon',
    'hexagon',
    'sector',
    'semicircle',
  ];

  const shapes = [
    squareShape,
    rectangleShape,
    equilateralTriangleShape,
    isoscelesTriangleShape,
    rightTriangleShape,
    longRightTriangleShape,
    rhombusShape,
    trapezoidShape,
    pentagonShape,
    hexagonShape,
    sectorShape,
    semicircleShape,
  ];

  it('所有形状ID与预期一致', () => {
    const shapeIds = shapes.map(s => s.id);
    expect(shapeIds.sort()).toEqual(expectedShapeIds.sort());
  });

  it('每个形状ID唯一', () => {
    const shapeIds = shapes.map(s => s.id);
    const uniqueIds = [...new Set(shapeIds)];
    expect(shapeIds.length).toBe(uniqueIds.length);
  });
});
