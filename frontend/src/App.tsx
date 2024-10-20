import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import CompanyTable from "./components/CompanyTable";
import { getCollectionsMetadata, getTaskStatus } from "./utils/jam-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "./components/NavigationMenu";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function App() {

  const queryClient = useQueryClient();
  
  // State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [likedCollectionId, setLikedCollectionId] = useState<string>();
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);

  const previousTaskStatusesRef = useRef<any[]>([]);

  // Queries

  const { data: collectionResponse } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollectionsMetadata,
  });

  // Effects
  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
    setLikedCollectionId(collectionResponse?.find((collection: any) => collection.collection_name == "Liked Companies")?.id);
  }, [collectionResponse]);

  useEffect(() => {
    const fetchTaskStatuses = async () => {
      const statuses = await Promise.all(taskIds.map(taskId => getTaskStatus(taskId)));
      setTaskStatuses(statuses);

      statuses.forEach((status, index) => {
        if (status.state !== previousTaskStatusesRef.current[index]?.state) {
          queryClient.invalidateQueries({
            queryKey: ['companies', selectedCollectionId]
          });
        }
      });
      previousTaskStatusesRef.current = statuses;
    };

    if (taskIds.length > 0) {
      fetchTaskStatuses();
      const interval = setInterval(fetchTaskStatuses, 10000);
      return () => clearInterval(interval);
    }
  }, [taskIds, queryClient, selectedCollectionId]);
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="mx-8">
        <div className="font-bold text-xl border-b p-2 mb-4 text-left">
          Harmonic Jam
        </div>
        <div className="flex">
          <div className="w-1/5">
            <p className=" font-bold border-b pb-2">Collections</p>
            <div className="flex flex-col gap-2">
              {collectionResponse?.map((collection: any) => {
                return (
                  <div
                    className={`py-1 hover:cursor-pointer hover:bg-orange-300 ${selectedCollectionId === collection.id &&
                      "bg-orange-500 font-bold"
                      }`}
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                    }}
                  >
                    {collection.collection_name}
                  </div>
                );
              })}

              <NavigationMenu className="mt-10">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-xl bg-orange-500">Tasks</NavigationMenuTrigger>
                    <NavigationMenuContent className="min-w-[800px] min-h-[400px] bg-orange-500">
                      <div className="flex">
                        <div className="w-1/3 mx-1 flex flex-col gap-2">
                          <p className="font-bold">In Progress</p>
                          {taskStatuses.filter(task => task.state === 'PENDING' || task.state === 'PROGRESS').map((task, index) => (
                            <div key={index} className="flex flex-col items-start gap-1 p-2 rounded-md bg-orange-300">
                              <p className="text-sm">ID: {taskIds[index].split('-').slice(0, 2).join('-')}</p>
                              {task.state === 'PROGRESS' && <p className="text-sm">Progress: {((task.current / task.total) * 100).toFixed(2)}%</p>}
                            </div>
                          ))}
                        </div>
                        <div className="w-1/3 mx-1 flex flex-col gap-2">
                          <p className="font-bold">Completed</p>
                          {taskStatuses.filter(task => task.state !== 'PENDING' && task.state !== 'PROGRESS' && task.state !== 'FAILURE').map((task, index) => (
                            <div key={index} className="flex flex-col items-start gap-1 p-2 rounded-md bg-orange-300">
                              <p className="text-sm">ID: {taskIds[index].split('-').slice(0, 2).join('-')}</p>
                              <p className="text-sm">Progress: {((task.current / task.total) * 100).toFixed(2)}%</p>
                            </div>
                          ))}
                        </div>
                        <div className="w-1/3 mx-1 flex flex-col gap-2">
                          <p className="font-bold">Failed</p>
                          {taskStatuses.filter(task => task.state === 'FAILURE').map((task, index) => (
                            <div key={index} className="flex flex-col items-start gap-1 p-2 rounded-md bg-orange-300">
                              <p className="text-sm">ID: {taskIds[index].split('-').slice(0, 2).join('-')}</p>
                              <p className="text-sm">Error: {task.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="w-4/5 ml-4">
            {selectedCollectionId && likedCollectionId && (
              <CompanyTable selectedCollectionId={selectedCollectionId} likedCollectionId={likedCollectionId} setTaskIds={setTaskIds} />
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
