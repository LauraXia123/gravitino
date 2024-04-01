/*
 * Copyright 2023 Datastrato Pvt Ltd.
 * This software is licensed under the Apache License version 2.
 */

'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'

import { Box, Typography, IconButton } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import {
  VisibilityOutlined as ViewIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  AddOutlined as AddIcon
} from '@mui/icons-material'

import ColumnTypeChip from '@/components/ColumnTypeChip'
import DetailsDrawer from '@/components/DetailsDrawer'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'
import CreateCatalogDialog from '../../CreateCatalogDialog'
import AddTagsForColumnDialog from '../../AddTagsForColumnDialog'

import { useAppSelector, useAppDispatch } from '@/lib/hooks/useStore'
import { updateCatalog, deleteCatalog } from '@/lib/store/metalakes'

import { to } from '@/lib/utils'
import { getCatalogDetailsApi } from '@/lib/api/catalogs'
import { useSearchParams } from 'next/navigation'

const EmptyText = () => {
  return (
    <Typography variant='caption' color={theme => theme.palette.text.disabled}>
      N/A
    </Typography>
  )
}

const TableView = () => {
  const searchParams = useSearchParams()
  const paramsSize = [...searchParams.keys()].length
  const metalake = searchParams.get('metalake') || ''

  const defaultPaginationConfig = { pageSize: 10, page: 0 }
  const pageSizeOptions = [10, 25, 50]

  const dispatch = useAppDispatch()

  const [paginationModel, setPaginationModel] = useState(defaultPaginationConfig)
  const store = useAppSelector(state => state.metalakes)

  const [openDrawer, setOpenDrawer] = useState(false)
  const [drawerData, setDrawerData] = useState()
  const [confirmCacheData, setConfirmCacheData] = useState(null)
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogData, setDialogData] = useState({})
  const [rowData, setRowData] = useState({})
  const [openAddTagsDialog, setOpenAddTagsDialog] = useState(false)
  const [dialogType, setDialogType] = useState('create')

  const handleClickUrl = path => {
    if (!path) {
      return
    }
  }

  const columns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name, path } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              {...(path
                ? {
                    component: Link,
                    href: path
                  }
                : {})}
              onClick={() => handleClickUrl(path)}
              sx={{
                fontWeight: 400,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' }
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    }
  ]

  const catalogsColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name, path } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              {...(path
                ? {
                    component: Link,
                    href: path
                  }
                : {})}
              onClick={() => handleClickUrl(path)}
              sx={{
                fontWeight: 400,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' }
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 90,
      sortable: false,
      disableColumnMenu: true,
      type: 'actions',
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <>
          <IconButton
            title='Details'
            size='small'
            sx={{ color: theme => theme.palette.text.secondary }}
            onClick={() => handleShowDetails({ row, type: 'catalog' })}
            data-refer={`view-catalog-${row.name}`}
          >
            <ViewIcon viewBox='0 0 24 22' />
          </IconButton>

          <IconButton
            title='Edit'
            size='small'
            sx={{ color: theme => theme.palette.text.secondary }}
            onClick={() => handleShowEditDialog({ row, type: 'catalog' })}
            data-refer={`edit-catalog-${row.name}`}
          >
            <EditIcon />
          </IconButton>

          <IconButton
            title='Delete'
            size='small'
            sx={{ color: theme => theme.palette.error.light }}
            onClick={() => handleDelete({ name: row.name, type: 'catalog', catalogType: row.type })}
            data-refer={`delete-catalog-${row.name}`}
          >
            <DeleteIcon />
          </IconButton>
        </>
      )
    }
  ]

  const tableColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={name}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'type',
      headerName: 'Type',
      renderCell: ({ row }) => {
        const { type } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ColumnTypeChip type={type} />
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'boolean',
      field: 'nullable',
      headerName: 'Nullable',
      renderCell: ({ row }) => {
        const { nullable } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              variant='body2'
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                textDecoration: 'none'
              }}
            >
              {typeof nullable !== 'undefined' && `${nullable}`}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'boolean',
      field: 'autoIncrement',
      headerName: 'AutoIncrement',
      renderCell: ({ row }) => {
        const { autoIncrement } = row

        return typeof autoIncrement !== 'undefined' ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              variant='body2'
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                textDecoration: 'none'
              }}
            >
              {`${autoIncrement}`}
            </Typography>
          </Box>
        ) : (
          <EmptyText />
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 100,
      disableColumnMenu: true,
      type: 'string',
      field: 'tags',
      headerName: 'Tags',
      renderCell: ({ row }) => {
        const { tags } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            {tags ? (
              tags.map(t => {
                return <ColumnTypeChip key={t} type={t} />
              })
            ) : (
              <EmptyText />
            )}
            <IconButton
              title='Add tags'
              size='small'
              sx={{ color: theme => theme.palette.text.secondary }}
              onClick={() => handleAddTagsDialog(row)}
              data-refer={`add-tags-${row.name}`}
            >
              <AddIcon />
            </IconButton>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'comment',
      headerName: 'Comment',
      renderCell: ({ row }) => {
        const { comment } = row

        return typeof comment !== 'undefined' ? (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              title={comment}
              variant='body2'
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                textDecoration: 'none'
              }}
            >
              {comment}
            </Typography>
          </Box>
        ) : (
          <EmptyText />
        )
      }
    }
  ]

  const tagListColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={name}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'description',
      headerName: 'Description',
      renderCell: ({ row }) => {
        const { description } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={description}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {description}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'createdBy',
      headerName: 'Created By',
      renderCell: ({ row }) => {
        const { createdBy } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {createdBy}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'createdTime',
      headerName: 'Created Time',
      renderCell: ({ row }) => {
        const { createdTime } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {new Date(createdTime).toLocaleDateString()}
            </Typography>
          </Box>
        )
      }
    }
  ]

  const maskListColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={name}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'dataType',
      headerName: 'Data Type',
      renderCell: ({ row }) => {
        const { dataType } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ColumnTypeChip type={dataType} />
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'expression',
      headerName: 'Expression',
      renderCell: ({ row }) => {
        const { expression } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={expression}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {expression}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'description',
      headerName: 'Description',
      renderCell: ({ row }) => {
        const { description } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={description}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {description}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'createdTime',
      headerName: 'Created Time',
      renderCell: ({ row }) => {
        const { createdTime } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {new Date(createdTime).toLocaleDateString()}
            </Typography>
          </Box>
        )
      }
    }
  ]

  const rowFilterListColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={name}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'expression',
      headerName: 'Expression',
      renderCell: ({ row }) => {
        const { expression } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={expression}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {expression}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'description',
      headerName: 'Description',
      renderCell: ({ row }) => {
        const { description } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={description}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {description}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'createdTime',
      headerName: 'Created Time',
      renderCell: ({ row }) => {
        const { createdTime } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {new Date(createdTime).toLocaleDateString()}
            </Typography>
          </Box>
        )
      }
    }
  ]

  const policyListColumns = [
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'name',
      headerName: 'Name',
      renderCell: ({ row }) => {
        const { name } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={name}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {name}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'description',
      headerName: 'Description',
      renderCell: ({ row }) => {
        const { description } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={description}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {description}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'scope',
      headerName: 'Scope',
      renderCell: ({ row }) => {
        const { scope } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={scope ? `${scope.catalog}.${scope.schema}.${scope.table}` : ''}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {scope ? `${scope.catalog}.${scope.schema}.${scope.table}` : ''}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'expression',
      headerName: 'Expression',
      renderCell: ({ row }) => {
        const { expression } = row

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography
              title={expression}
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {expression}
            </Typography>
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 100,
      disableColumnMenu: true,
      type: 'string',
      field: 'columnMask',
      headerName: 'Column Mask',
      renderCell: ({ row }) => {
        const { columnMask } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {columnMask &&
              columnMask.map(m => {
                return <ColumnTypeChip key={m} type={m} />
              })}
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 100,
      disableColumnMenu: true,
      type: 'string',
      field: 'rowFilter',
      headerName: 'Row Filter',
      renderCell: ({ row }) => {
        const { rowFilter } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {rowFilter &&
              rowFilter.map(f => {
                return <ColumnTypeChip key={f} type={f} />
              })}
          </Box>
        )
      }
    },
    {
      flex: 0.1,
      minWidth: 60,
      disableColumnMenu: true,
      type: 'string',
      field: 'createdTime',
      headerName: 'Created Time',
      renderCell: ({ row }) => {
        const { createdTime } = row

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                color: 'text.main',
                textDecoration: 'none'
              }}
            >
              {new Date(createdTime).toLocaleDateString()}
            </Typography>
          </Box>
        )
      }
    }
  ]

  const handleShowDetails = async ({ row, type }) => {
    if (type === 'catalog') {
      const [err, res] = await to(getCatalogDetailsApi({ metalake, catalog: row.name }))

      if (err || !res) {
        throw new Error(err)
      }

      setDrawerData(res.catalog)
      setOpenDrawer(true)
    }
  }

  const handleShowEditDialog = async data => {
    const metalake = data.row.namespace[0] || null
    const catalog = data.row.name || null

    if (metalake && catalog) {
      const [err, res] = await to(getCatalogDetailsApi({ metalake, catalog }))

      if (err || !res) {
        throw new Error(err)
      }

      const { catalog: resCatalog } = res

      setDialogType('update')
      setDialogData(resCatalog)
      setOpenDialog(true)
    }
  }

  const handleDelete = ({ name, type, catalogType }) => {
    setOpenConfirmDelete(true)
    setConfirmCacheData({ name, type, catalogType })
  }

  const handleCloseConfirm = () => {
    setOpenConfirmDelete(false)
    setConfirmCacheData(null)
  }

  const handleConfirmDeleteSubmit = () => {
    if (confirmCacheData) {
      if (confirmCacheData.type === 'catalog') {
        dispatch(deleteCatalog({ metalake, catalog: confirmCacheData.name, type: confirmCacheData.catalogType }))
      }

      setOpenConfirmDelete(false)
    }
  }

  const handleAddTagsDialog = row => {
    setOpenAddTagsDialog(true)
    setRowData(row)
  }

  const checkColumns = () => {
    if (paramsSize == 1 && searchParams.has('metalake')) {
      return catalogsColumns
    } else if (paramsSize == 5 && searchParams.has('table')) {
      return tableColumns
    } else if (paramsSize == 2 && searchParams.get('compliance') === 'Tag') {
      return tagListColumns
    } else if (paramsSize == 2 && searchParams.get('compliance') === 'Column_Mask') {
      return maskListColumns
    } else if (paramsSize == 2 && searchParams.get('compliance') === 'Row_Filter') {
      return rowFilterListColumns
    } else if (paramsSize == 2 && searchParams.get('compliance') === 'Access_Policy') {
      return policyListColumns
    } else {
      return columns
    }
  }

  useEffect(() => {
    setPaginationModel({ ...paginationModel, page: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.tableLoading])

  return (
    <Box className={`twc-h-full`}>
      <DataGrid
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderTop: 0
          }
        }}
        data-refer='table-grid'
        loading={store.tableLoading}
        rows={store.tableData}
        getRowId={row => row?.name}
        columns={checkColumns()}
        disableRowSelectionOnClick
        pageSizeOptions={pageSizeOptions}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />
      <DetailsDrawer
        openDrawer={openDrawer}
        setOpenDrawer={setOpenDrawer}
        drawerData={drawerData}
        isMetalakePage={paramsSize == 1 && searchParams.hasOwnProperty('metalake')}
      />
      <ConfirmDeleteDialog
        open={openConfirmDelete}
        setOpen={setOpenConfirmDelete}
        confirmCacheData={confirmCacheData}
        handleClose={handleCloseConfirm}
        handleConfirmDeleteSubmit={handleConfirmDeleteSubmit}
      />

      <CreateCatalogDialog
        open={openDialog}
        setOpen={setOpenDialog}
        updateCatalog={updateCatalog}
        data={dialogData}
        type={dialogType}
      />

      <AddTagsForColumnDialog open={openAddTagsDialog} setOpen={setOpenAddTagsDialog} rowData={rowData} />
    </Box>
  )
}

export default TableView
