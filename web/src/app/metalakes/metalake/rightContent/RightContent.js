/*
 * Copyright 2023 Datastrato Pvt Ltd.
 * This software is licensed under the Apache License version 2.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Box, Button, IconButton } from '@mui/material'
import Icon from '@/components/Icon'
import MetalakePath from './MetalakePath'
import CreateCatalogDialog from './CreateCatalogDialog'
import CreateTagDialog from './CreateTagDialog'
import CreateColumnMaskDialog from './CreateColumnMaskDialog'
import CreateRowFilterDialog from './CreateRowFilterDialog'
import CreateAccessPolicyDialog from './CreateAccessPolicyDialog'
import TabsContent from './tabsContent/TabsContent'
import { useSearchParams } from 'next/navigation'

const RightContent = () => {
  const [open, setOpenCatalog] = useState(false)
  const [openTag, setOpenTag] = useState(false)
  const [openColumnMask, setOpenColumnMask] = useState(false)
  const [openRowFilter, setOpenRowFilter] = useState(false)
  const [openAccessPolicy, setOpenAccessPolicy] = useState(false)
  const searchParams = useSearchParams()
  const paramsSize = [...searchParams.keys()].length
  const isMetalakePage = paramsSize == 1 && searchParams.get('metalake')
  const compliance = searchParams.get('compliance')
  const [isShowBtn, setBtnVisiable] = useState(true)

  const handleCreateDialog = () => {
    if (isMetalakePage) {
      setOpenCatalog(true)
    } else {
      switch (compliance) {
        case 'Tag':
          setOpenTag(true)
          break
        case 'Column_Mask':
          setOpenColumnMask(true)
          break
        case 'Row_Filter':
          setOpenRowFilter(true)
          break
        case 'Access_Policy':
          setOpenAccessPolicy(true)
          break
        default:
          break
      }
    }
  }

  useEffect(() => {
    setBtnVisiable(isMetalakePage || compliance)
  }, [searchParams, isMetalakePage, compliance])

  return (
    <Box className={`twc-w-0 twc-grow twc-h-full twc-bg-customs-white twc-overflow-hidden`}>
      <Box
        className={`twc-py-3 twc-px-5 twc-flex twc-items-center twc-justify-between`}
        sx={{
          borderBottom: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <Box className={`twc-flex twc-items-center`}>
          <Box className={`twc-flex twc-items-center twc-justify-between`}>
            <Box className={`twc-flex twc-items-center`}>
              <IconButton color='primary' component={Link} href='/metalakes' sx={{ mr: 2 }} data-refer='back-home-btn'>
                <Icon icon='mdi:arrow-left' />
              </IconButton>
              <MetalakePath />
            </Box>
          </Box>
        </Box>

        {isShowBtn && (
          <Box className={`twc-flex twc-items-center`}>
            <Button
              variant='contained'
              startIcon={<Icon icon='mdi:plus-box' />}
              onClick={handleCreateDialog}
              data-refer='create-catalog-btn'
            >
              Create {isMetalakePage ? 'Catalog' : compliance}
            </Button>
            <CreateCatalogDialog open={open} setOpen={setOpenCatalog} />
            <CreateTagDialog open={openTag} setOpen={setOpenTag} />
            <CreateColumnMaskDialog open={openColumnMask} setOpen={setOpenColumnMask} />
            <CreateRowFilterDialog open={openRowFilter} setOpen={setOpenRowFilter} />
            <CreateAccessPolicyDialog open={openAccessPolicy} setOpen={setOpenAccessPolicy} />
          </Box>
        )}
      </Box>

      <Box sx={{ height: 'calc(100% - 4.1rem)' }}>
        <TabsContent />
      </Box>
    </Box>
  )
}

export default RightContent
