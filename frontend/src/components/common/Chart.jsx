// src/components/common/Chart.jsx
import React from "react";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Required for filled line charts if used
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Chart = ({ type = "line", data, options, className = "" }) => {
  const ChartComponent = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut,
  }[type];

  if (!ChartComponent) {
    console.error(`Invalid chart type specified: ${type}`);
    return <div>Invalid Chart Type</div>;
  }

  // Default options to prevent errors if none are provided
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false, // Adjust aspect ratio as needed
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false, // Set to true if you want a title via options
        text: "Chart Title",
      },
    },
    // Conditionally add scales for non-pie/doughnut charts
    scales:
      type !== "pie" && type !== "doughnut"
        ? {
            y: {
              beginAtZero: true,
            },
          }
        : undefined,
  };

  return (
    <div className={`relative h-64 md:h-80 lg:h-96 ${className}`}>
      <ChartComponent options={{ ...defaultOptions, ...options }} data={data} />
    </div>
  );
};

export default Chart;
