"use client"

import React from "react";
import { Line, Bar, Doughnut, Radar, PolarArea, Bubble } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
  ChartData,
  ChartOptions
} from "chart.js";
import { ChartProps } from "@/types/chart-types";

// ChartJS bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

// Grafik Stil Ayarları
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        padding: 10,
        boxWidth: 10
      }
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: 10,
      titleColor: "#fff",
      bodyColor: "#fff",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      displayColors: true,
      boxWidth: 10,
      boxHeight: 10
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        font: {
          size: 10
        }
      }
    },
    y: {
      grid: {
        display: true,
        drawBorder: false,
        color: "rgba(0, 0, 0, 0.05)"
      },
      ticks: {
        font: {
          size: 10
        }
      }
    }
  }
};

// Line Chart
export function LineChart({ data, options = {} }: ChartProps) {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    elements: {
      line: {
        tension: 0.3 // Çizgi eğriliği
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    }
  };

  return <Line data={data} options={mergedOptions} />;
}

// Bar Chart
export function BarChart({ data, options = {} }: ChartProps) {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    elements: {
      bar: {
        borderWidth: 1
      }
    }
  };

  return <Bar data={data} options={mergedOptions} />;
}

// Doughnut Chart
export function DoughnutChart({ data, options = {} }: ChartProps) {
  const mergedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          padding: 10,
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 10,
        titleColor: "#fff",
        bodyColor: "#fff",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10
      }
    },
    ...options
  };

  return <Doughnut data={data} options={mergedOptions} />;
}

// Radar Chart
export function RadarChart({ data, options = {} }: ChartProps) {
  const mergedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const
      }
    },
    scales: {
      r: {
        ticks: {
          backdropColor: "transparent",
          font: {
            size: 10
          }
        },
        pointLabels: {
          font: {
            size: 10
          }
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)"
        },
        angleLines: {
          color: "rgba(0, 0, 0, 0.1)"
        }
      }
    },
    ...options
  };

  return <Radar data={data} options={mergedOptions} />;
}
