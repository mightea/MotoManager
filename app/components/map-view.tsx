import React from 'react';

interface MapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  zoom?: number;
}

export function MapView({ latitude, longitude, title = "Standort Karte", zoom = 15 }: MapViewProps) {
  // Rough conversion of zoom level to bbox offset
  // At zoom 15, we want about 0.005 degree offset
  const offset = 0.005 * Math.pow(2, 15 - zoom);
  
  const bbox = `${longitude - offset}%2C${latitude - offset}%2C${longitude + offset}%2C${latitude + offset}`;
  const marker = `${latitude}%2C${longitude}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-navy-600">
      <iframe
        title={title}
        width="100%"
        height="200"
        src={src}
        className="block"
      ></iframe>
      <div className="bg-gray-50 px-3 py-1.5 text-[10px] text-secondary dark:bg-navy-900 dark:text-navy-400">
        <a 
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Grössere Karte anzeigen
        </a>
      </div>
    </div>
  );
}
