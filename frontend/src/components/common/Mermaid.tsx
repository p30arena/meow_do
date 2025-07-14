import React, { useEffect, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "default" });
    const renderMermaid = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(
          "mermaid-graph-" + Math.random().toString(36).substring(2, 9),
          chart
        );
        setSvg(renderedSvg);
      } catch (error) {
        console.error("Error rendering mermaid chart:", error);
        setSvg(
          `<p class="text-red-500">Error rendering chart: ${(error as Error).message}</p>`
        );
      }
    };
    if (chart) {
      renderMermaid();
    }
  }, [chart]);

  if (!svg) {
    return <div>Loading diagram...</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default Mermaid;