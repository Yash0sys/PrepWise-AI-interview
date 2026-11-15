import { useState, useEffect } from "react";
import { cn, getTechLogos } from "../lib/utils";

const DisplayTechIcons = ({ techStack = [] }) => {
  const [techIcons, setTechIcons] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (techStack && techStack.length > 0) {
      getTechLogos(techStack).then((icons) => {
        if (isMounted) setTechIcons(icons);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [techStack]);

  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex flex-center",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip">{tech}</span>

          <img
            src={url}
            alt={tech}
            width={100}
            height={100}
            className="size-5"
          />
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
