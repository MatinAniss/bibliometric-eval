"use client";

import { DragEvent, useState } from "react";
import { parse } from "papaparse";
import { LineSeries, ResponsiveLine } from "@nivo/line";
import { ResponsiveChoropleth } from "@nivo/geo";
import countryLookup from "country-code-lookup";
import countires from "../../data/world_countries.json";
import { BarDatum, ResponsiveBar } from "@nivo/bar";
import { ResponsiveTreeMap } from "@nivo/treemap";

interface Publication {
  authors: string[];
  title: string;
  year: number;
  citedBy: number;
  doi: string;
  country: string;
}

const graphThemes = { text: { fill: "white" }, tooltip: { container: { background: "#121212" } } };

export default function Home() {
  const [isDropping, setIsDropping] = useState<boolean>();
  const [data, setData] = useState<Publication[]>([]);

  const [showPublications, setShowPublications] = useState<boolean>(false);

  const [publicationsByYear, setPublicationsByYear] = useState<LineSeries[]>([]);

  const [publicationsByCountryMax, setPublicationsByCountryMax] = useState<number>(0);
  const [publicationsByCountry, setPublicationsByCountry] = useState<{ id: string; value: number }[]>([]);

  const [publicationsByAuthor, setPublicationsByAuthor] = useState<BarDatum[]>([]);

  const [citationsByCountryMax, setCitationsByCountryMax] = useState<number>(0);
  const [citationsByCountry, setCitationsByCountry] = useState<{ id: string; value: number }[]>([]);

  const [citationsByAuthor, setCitationsByAuthor] = useState<BarDatum[]>([]);

  const [citationsByPublication, setCitationsByPublication] = useState<{ name: string; citations: number }[]>([]);

  async function processFile(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDropping(false);

    if (e.dataTransfer) {
      const file = e.dataTransfer.files[0];

      if (file && (file.type === "text/plain" || file.type === "text/csv")) {
        parse(file, {
          skipEmptyLines: true,
          complete: (parsed) => {
            const headers = parsed.data[0] as string[];
            if (!headers) return;

            // Get index of each header
            const authorsIndex = headers.findIndex((h) => h === "Author full names");
            const titleIndex = headers.findIndex((h) => h === "Title");
            const yearIndex = headers.findIndex((h) => h === "Year");
            const citedByIndex = headers.findIndex((h) => h === "Cited by");
            const DOIIndex = headers.findIndex((h) => h === "DOI");
            const affiliationsIndex = headers.findIndex((h) => h === "Affiliations");

            // Parse the data into publications
            const data: Publication[] = [];
            for (let i = 1; i < parsed.data.length; i++) {
              const row = parsed.data[i] as string[];

              data.push({
                authors: row[authorsIndex].split("; "),
                title: row[titleIndex],
                year: parseInt(row[yearIndex]),
                citedBy: parseInt(row[citedByIndex]),
                doi: row[DOIIndex],
                country: (() => {
                  const split = row[affiliationsIndex]?.split(", ");
                  return split[split.length - 1];
                })()
              });
            }
            setData(data);

            // Publications by year
            const publicationsByYearData: Record<number, number> = {};
            for (let i = 0; i < data.length; i++) {
              const year = data[i].year;

              if (publicationsByYearData[year]) {
                publicationsByYearData[year]++;
              } else {
                publicationsByYearData[year] = 1;
              }
            }
            setPublicationsByYear([
              {
                id: "Publications",
                data: Object.entries(publicationsByYearData).map(([key, value]) => {
                  return { x: key, y: value };
                })
              }
            ]);

            // Publications by country
            const publicationsByCountryData: Record<string, number> = {};
            let publicationsByCountryMaxAmount = 0;
            for (let i = 0; i < data.length; i++) {
              const country = countryLookup.byCountry(data[i].country)?.iso3;

              if (country) {
                if (publicationsByCountryData[country]) {
                  publicationsByCountryData[country]++;
                } else {
                  publicationsByCountryData[country] = 1;
                }

                if (Math.max(publicationsByCountryData[country], publicationsByCountryMaxAmount) > publicationsByCountryMaxAmount) {
                  publicationsByCountryMaxAmount = publicationsByCountryData[country];
                }
              }
            }
            setPublicationsByCountryMax(publicationsByCountryMaxAmount);
            setPublicationsByCountry(
              Object.entries(publicationsByCountryData).map(([key, value]) => {
                return { id: key, value };
              })
            );

            // Publications by author
            const publicationsByAuthorData: Record<string, number> = {};
            for (let i = 0; i < data.length; i++) {
              const authors = data[i].authors;

              for (let x = 0; x < authors.length; x++) {
                const author = authors[x];

                if (author) {
                  if (publicationsByAuthorData[author]) {
                    publicationsByAuthorData[author]++;
                  } else {
                    publicationsByAuthorData[author] = 1;
                  }
                }
              }
            }
            setPublicationsByAuthor(
              Object.entries(publicationsByAuthorData)
                .map(([key, value]) => {
                  return { author: key, Publications: value };
                })
                .sort((a, b) => b.Publications - a.Publications)
                .slice(0, 10)
                .reverse()
            );

            // Citations by country
            const citationsByCountryData: Record<string, number> = {};
            let citationsByCountryMaxAmount = 0;
            for (let i = 0; i < data.length; i++) {
              const country = countryLookup.byCountry(data[i].country)?.iso3;

              if (country) {
                if (citationsByCountryData[country]) {
                  citationsByCountryData[country] += data[i].citedBy;
                } else {
                  citationsByCountryData[country] = data[i].citedBy;
                }

                if (Math.max(citationsByCountryData[country], citationsByCountryMaxAmount) > citationsByCountryMaxAmount) {
                  citationsByCountryMaxAmount = citationsByCountryData[country];
                }
              }
            }
            setCitationsByCountryMax(citationsByCountryMaxAmount);
            setCitationsByCountry(
              Object.entries(citationsByCountryData).map(([key, value]) => {
                return { id: key, value };
              })
            );

            // Citations by author
            const citationsByAuthorData: Record<string, number> = {};
            for (let i = 0; i < data.length; i++) {
              const authors = data[i].authors;

              for (let x = 0; x < authors.length; x++) {
                const author = authors[x];

                if (author) {
                  if (citationsByAuthorData[author]) {
                    citationsByAuthorData[author] += data[i].citedBy;
                  } else {
                    citationsByAuthorData[author] = data[i].citedBy;
                  }
                }
              }
            }
            setCitationsByAuthor(
              Object.entries(citationsByAuthorData)
                .map(([key, value]) => {
                  return { author: key, Citations: value };
                })
                .sort((a, b) => b.Citations - a.Citations)
                .slice(0, 10)
                .reverse()
            );

            // Citations by publication
            setCitationsByPublication(
              data
                .map((d) => {
                  return { name: `${d.title}${d.doi === "" ? "" : ` ${d.doi}`}`, citations: d.citedBy };
                })
                .filter((p) => p.citations >= 10)
                .sort((a, b) => b.citations - a.citations)
            );
          }
        });
      }
    }
  }

  function dragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDropping(true);
  }

  function dragLeave(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDropping(false);
  }

  return (
    <main className="h-screen" onDrop={processFile} onDragOver={dragOver} onDragLeave={dragLeave}>
      {isDropping ? (
        <div className="fixed w-full h-full flex items-center justify-center z-50">
          <div className="w-1/2 h-1/2 flex items-center justify-center outline outline-white outline-dashed rounded-md bg-[#121212] opacity-95">Drop Scopus file Here</div>
        </div>
      ) : (
        <></>
      )}
      <div className="w-full flex flex-col gap-12 py-8 px-4 mx-auto max-w-7xl">
        <h1 className="text-3xl">Bibliometric Eval</h1>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Publications Over Time</h2>
          <div className="h-[28rem]">
            <ResponsiveLine
              data={publicationsByYear}
              margin={{ top: 10, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{
                type: "linear",
                min: "auto",
                max: "auto"
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Years",
                legendOffset: 36,
                legendPosition: "middle",
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Publications",
                legendOffset: -40,
                legendPosition: "middle",
                truncateTickAt: 0
              }}
              pointSize={10}
              enableArea={true}
              useMesh={true}
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 100,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: "circle"
                }
              ]}
              colors={{ scheme: "red_yellow_green" }}
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Publications By Country</h2>
          <div className="h-[28rem]">
            <ResponsiveChoropleth
              features={countires.features}
              data={publicationsByCountry}
              valueFormat=".0f"
              domain={[0, publicationsByCountryMax]}
              projectionType="naturalEarth1"
              projectionScale={165}
              enableGraticule={true}
              borderWidth={0.5}
              borderColor="#152538"
              legends={[
                {
                  anchor: "bottom-left",
                  direction: "column",
                  justify: true,
                  translateX: 20,
                  translateY: -100,
                  itemsSpacing: 0,
                  itemWidth: 94,
                  itemHeight: 18,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 18
                }
              ]}
              colors="RdYlGn"
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Publications By Author</h2>
          <h3 className="text-xs">Top 10</h3>
          <div className="h-[28rem]">
            <ResponsiveBar
              data={publicationsByAuthor}
              keys={["Publications"]}
              layout="horizontal"
              indexBy="author"
              margin={{ top: 20, right: 130, bottom: 50, left: 250 }}
              padding={0.3}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Publications",
                legendPosition: "middle",
                legendOffset: 32,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Authors",
                legendPosition: "middle",
                legendOffset: -230,
                truncateTickAt: 0
              }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: "circle"
                }
              ]}
              colors={{ scheme: "red_yellow_green" }}
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Citations By Country</h2>
          <div className="h-[28rem]">
            <ResponsiveChoropleth
              features={countires.features}
              data={citationsByCountry}
              valueFormat=".0f"
              domain={[0, citationsByCountryMax]}
              projectionType="naturalEarth1"
              projectionScale={165}
              enableGraticule={true}
              borderWidth={0.5}
              borderColor="#152538"
              legends={[
                {
                  anchor: "bottom-left",
                  direction: "column",
                  justify: true,
                  translateX: 20,
                  translateY: -100,
                  itemsSpacing: 0,
                  itemWidth: 94,
                  itemHeight: 18,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 18
                }
              ]}
              colors="RdYlGn"
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Citations By Author</h2>
          <h3 className="text-xs">Top 10</h3>
          <div className="h-[28rem]">
            <ResponsiveBar
              data={citationsByAuthor}
              keys={["Citations"]}
              layout="horizontal"
              indexBy="author"
              margin={{ top: 20, right: 130, bottom: 50, left: 250 }}
              padding={0.3}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Citations",
                legendPosition: "middle",
                legendOffset: 32,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Authors",
                legendPosition: "middle",
                legendOffset: -230,
                truncateTickAt: 0
              }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: "circle"
                }
              ]}
              colors={{ scheme: "red_yellow_green" }}
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 outline outline-white rounded-md">
          <h2 className="text-xl">Citations By Publication</h2>
          <h3 className="text-xs">Minimum 10 citations</h3>

          <div className="h-[28rem]">
            <ResponsiveTreeMap
              data={{
                name: "Publications",
                children: citationsByPublication
              }}
              identity="name"
              value="citations"
              valueFormat=".0f"
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              borderColor={{
                from: "color",
                modifiers: [["darker", 0.1]]
              }}
              colors={{ scheme: "red_yellow_green" }}
              theme={graphThemes}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div>Total Publications: {data.length}</div>
          <div className="flex flex-col text-xs">
            {showPublications ? (
              <>
                <span
                  className="cursor-pointer text-xl underline"
                  onClick={() => {
                    setShowPublications(!showPublications);
                  }}
                >
                  Hide publications
                </span>
                {data.map((publication, i) => (
                  <div key={i}>{publication.title}</div>
                ))}
              </>
            ) : (
              <span
                className="cursor-pointer text-xl underline"
                onClick={() => {
                  setShowPublications(!showPublications);
                }}
              >
                Show publications
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
