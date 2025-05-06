import React, { useState, useEffect } from "react";

const LoadingComponent = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      {isLoading ? (
        <img
          src="/loading.gif"
          alt="Loading..."
          style={{ width: "100px", height: "100px" }}
        />
      ) : (
        <h1>Content Loaded!</h1>
      )}
    </div>
  );
};

export default LoadingComponent;
