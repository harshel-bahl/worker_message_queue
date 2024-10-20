import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, modifyCompaniesInCollection, selectAllCompanies } from "../utils/jam-api";
import { Button } from "@mui/material";
import { useToast } from "../hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const CompanyTable = (props: { selectedCollectionId: string, likedCollectionId: string, setTaskIds: React.Dispatch<React.SetStateAction<string[]>> }) => {

  const { toast } = useToast()
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const { data: queryResponse } = useQuery({
    queryKey: ["companies", props.selectedCollectionId],
    queryFn: () => getCollectionsById(props.selectedCollectionId, offset, pageSize),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (queryResponse) {
      setResponse(queryResponse.companies);
      setTotal(queryResponse.total);
    }
  }, [queryResponse]);

  useEffect(() => {
    setOffset(0);
  }, [props.selectedCollectionId]);

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["companies", props.selectedCollectionId]
    });
  }, [offset, pageSize]);

  const handleModifyCollection = async (action: string) => {
    try {
      const result = await modifyCompaniesInCollection(props.likedCollectionId, selectedRows, action);

      if (result.status === "completed") {
        toast({
          title: `Companies ${action === "add" ? "added to" : "removed from"} collection successfully!`,
        });
        setSelectedRows([]);
        queryClient.invalidateQueries({
          queryKey: ["companies", props.selectedCollectionId]
        });
      } else if (result.status === "in_progress") {
        toast({
          title: `Task in progress. Task ID: ${result.task_id}`,
        });
        props.setTaskIds((prevTaskIds) => [...prevTaskIds, result.task_id]);
        setSelectedRows([]);
      }
    } catch (error) {
      console.error(`Error ${action === "add" ? "adding" : "removing"} companies to/from collection:`, error);
      alert(`Failed to ${action === "add" ? "add" : "remove"} companies to/from collection.`);
    }
  };

  const handleSelectAll = async () => {
    const result = await selectAllCompanies(props.selectedCollectionId, props.likedCollectionId);
    if (result.status === "completed") {
      toast({
        title: "Companies added successfully!",
      });
    } else if (result.status === "in_progress") {
      toast({
        title: `Task in progress. Task ID: ${result.task_id}`,
      });
      props.setTaskIds((prevTaskIds) => [...prevTaskIds, result.task_id]);
      setSelectedRows([]);
    }
  };

  return (
    <div style={{ height: 800, width: "100%" }}>
      <div className="relative">
        <DataGrid
          rows={response}
          rowHeight={30}
          columns={[
            { field: "liked", headerName: "Liked", width: 90 },
            { field: "id", headerName: "ID", width: 90 },
            { field: "company_name", headerName: "Company Name", width: 200 },
          ]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          rowCount={total}
          pagination
          checkboxSelection
          paginationMode="server"
          onPaginationModelChange={(newMeta) => {
            setPageSize(newMeta.pageSize);
            setOffset(newMeta.page * newMeta.pageSize);
          }}
          onRowSelectionModelChange={(newSelection) => {

            let newSelectedRows = [...selectedRows];

            newSelection.forEach((id) => {
              if (!selectedRows.includes(Number(id))) {
                newSelectedRows.push(Number(id));
              }
            });

            selectedRows.forEach((id) => {
              if (id > offset && id <= offset + pageSize && !newSelection.includes(id)) {
                newSelectedRows = newSelectedRows.filter((row) => row !== id);
              }
            });
            setSelectedRows(newSelectedRows);
          }}
          rowSelectionModel={Array.from(selectedRows)}

        />

        <div className="absolute flex gap-5 top-3 right-3">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => setSelectedRows([])}
              >
                Deselect All
              </Button>

              {props.selectedCollectionId !== props.likedCollectionId && <Button variant="contained" color="primary" size="small" onClick={() => handleModifyCollection("add")}>
                Add to Liked
              </Button>}

              <Button variant="contained" color="primary" size="small" onClick={() => handleModifyCollection("remove")}>
                Remove from Liked
              </Button>
            </>
          )}

          {selectedRows.length === 0 && props.selectedCollectionId !== props.likedCollectionId && (
            <Button variant="contained" color="primary" size="small" onClick={handleSelectAll}>
              Add All to Liked
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyTable;
