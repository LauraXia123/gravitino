/*
 * Copyright 2024 Datastrato Pvt Ltd.
 * This software is licensed under the Apache License version 2.
 */

'use client'

import { useState, forwardRef, useEffect } from 'react'

import {
  Box,
  Grid,
  Button,
  Dialog,
  TextField,
  Typography,
  DialogContent,
  DialogActions,
  IconButton,
  Fade,
  Select,
  MenuItem,
  InputLabel,
  OutlinedInput,
  Chip,
  FormControl,
  FormHelperText
} from '@mui/material'

import Icon from '@/components/Icon'

import { useAppDispatch, useAppSelector } from '@/lib/hooks/useStore'
import { createAccessPolicy, updateAccessPolicy } from '@/lib/store/metalakes'

import * as yup from 'yup'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

import { genUpdates, extractPlaceholder } from '@/lib/utils'
import { nameRegex } from '@/lib/utils/regex'
import { useSearchParams } from 'next/navigation'

import { fetchCatalogs, fetchSchemas, fetchTables, fetchFilesets, fetchComplianceList } from '@/lib/store/metalakes'

const defaultValues = {
  name: '',
  description: '',
  scope: {
    catalog: '',
    schema: '',
    table: ''
  },
  expression: '',
  columnMask: [],
  rowFilter: []
}

const schema = yup.object().shape({
  name: yup
    .string()
    .required()
    .matches(
      nameRegex,
      'This field must start with a letter or underscore, and can only contain letters, numbers, and underscores'
    )
})

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

const CreateAccessPolicyDialog = props => {
  const { open, setOpen, type = 'create', data = {} } = props
  const searchParams = useSearchParams()
  const metalake = searchParams.get('metalake')
  const store = useAppSelector(state => state.metalakes)
  const dispatch = useAppDispatch()

  const [cacheData, setCacheData] = useState()

  useEffect(() => {
    if (open) {
      dispatch(fetchCatalogs({ init: false, page: 'metalakes', metalake }))
      dispatch(fetchComplianceList({ init: false, metalake, compliance: 'Column_Mask' }))
      dispatch(fetchComplianceList({ init: false, metalake, compliance: 'Row_Filter' }))
    }
  }, [open, dispatch, metalake])

  const {
    control,
    reset,
    setValue,
    getValues,
    handleSubmit,
    trigger,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const handleClose = () => {
    reset()
    setOpen(false)
  }

  const handleClickSubmit = e => {
    e.preventDefault()

    return handleSubmit(onSubmit(getValues()), onError)
  }

  const handleChange = (onChange, e) => {
    const pathArr = extractPlaceholder(e.target.value)
    const [metalake, catalog, type, schema] = pathArr
    const paramsSize = pathArr.length
    onChange(e.target.value)

    switch (paramsSize) {
      case 3:
        dispatch(fetchSchemas({ init: false, page: 'catalogs', metalake, catalog, type }))
        break
      case 4: {
        if (type === 'fileset') {
          dispatch(fetchFilesets({ init: false, page: 'schemas', metalake, catalog, schema }))
        } else {
          dispatch(fetchTables({ init: false, page: 'schemas', metalake, catalog, schema }))
        }
        break
      }
      default:
        break
    }
  }

  const handleMultipleChange = (onChange, e) => {
    const {
      target: { value }
    } = e
    onChange(typeof value === 'string' ? value.split(',') : value)
  }

  const getScopeData = scope => {
    for (let k in scope) {
      const pathArr = extractPlaceholder(scope[k])
      const [metalake, catalog, type, schema, table] = pathArr
      const paramsSize = pathArr.length
      switch (paramsSize) {
        case 3:
          scope[k] = catalog
          break
        case 4: {
          scope[k] = schema
          break
        }
        default:
          scope[k] = table
          break
      }
    }

    return scope
  }

  const onSubmit = data => {
    trigger()

    schema
      .validate(data)
      .then(() => {
        if (type === 'create') {
          data.scope = getScopeData(data.scope)
          dispatch(createAccessPolicy({ data, metalake })).then(res => {
            if (!res.payload?.err) {
              handleClose()
            }
          })
        } else {
          const reqData = { updates: genUpdates(cacheData, data) }

          if (reqData.updates.length !== 0) {
            dispatch(updateAccessPolicy({ metalake, tag: cacheData.name, data: reqData })).then(res => {
              if (!res.payload?.err) {
                handleClose()
              }
            })
          }
        }
      })
      .catch(err => {
        console.error('valid error', err)
      })
  }

  const onError = errors => {
    console.error('fields error', errors)
  }

  useEffect(() => {
    if (open && JSON.stringify(data) !== '{}') {
      setCacheData(data)
      setValue('name', data.name)
      setValue('description', data.description)
    }
  }, [open, data, setValue])

  return (
    <Dialog fullWidth maxWidth='sm' scroll='body' TransitionComponent={Transition} open={open} onClose={handleClose}>
      <form onSubmit={e => handleClickSubmit(e)}>
        <DialogContent
          sx={{
            position: 'relative',
            pb: theme => `${theme.spacing(8)} !important`,
            px: theme => [`${theme.spacing(5)} !important`, `${theme.spacing(15)} !important`],
            pt: theme => [`${theme.spacing(8)} !important`, `${theme.spacing(12.5)} !important`]
          }}
        >
          <IconButton
            size='small'
            onClick={() => handleClose()}
            sx={{ position: 'absolute', right: '1rem', top: '1rem' }}
          >
            <Icon icon='bx:x' />
          </IconButton>
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography variant='h5' sx={{ mb: 3 }}>
              {type === 'create' ? 'Create' : 'Edit'} Access Policy
            </Typography>
          </Box>

          <Typography sx={{ mb: 2 }} variant='subtitle1'>
            Policy name and description
          </Typography>

          <Grid container spacing={6}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <Controller
                  name='name'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <TextField
                      value={value}
                      label='Name'
                      onChange={onChange}
                      placeholder=''
                      error={Boolean(errors.name)}
                      data-refer='tag-name-field'
                    />
                  )}
                />
                {errors.name && <FormHelperText sx={{ color: 'error.main' }}>{errors.name.message}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <Controller
                  name='description'
                  control={control}
                  rules={{ required: false }}
                  render={({ field: { value, onChange } }) => (
                    <TextField
                      value={value}
                      label='Description'
                      multiline
                      rows={2}
                      onChange={onChange}
                      placeholder=''
                      error={Boolean(errors.comment)}
                      data-refer='tag-description-field'
                    />
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant='subtitle1'>Scope</Typography>
              <Typography sx={{ mb: 2 }} variant='body2'>
                The Objects selected limit what the matching expression can apply to.
              </Typography>
              <FormControl xs={4} sx={{ mr: 2 }}>
                <InputLabel id='select-policy-catalog' error={Boolean(errors.catalog)}>
                  Catalogs
                </InputLabel>
                <Controller
                  name='scope.catalog'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Catalogs'
                      onChange={e => handleChange(onChange, e)}
                      error={Boolean(errors.catalog)}
                      labelId='select-policy-catalog'
                    >
                      <MenuItem key={'*'} value={'*'}>
                        *
                      </MenuItem>
                      {store.catalogs.map(item => {
                        return (
                          <MenuItem key={item.name} value={item.key}>
                            {item.name}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.catalog && (
                  <FormHelperText sx={{ color: 'error.main' }}>{errors.catalog.message}</FormHelperText>
                )}
              </FormControl>
              <FormControl xs={4} sx={{ mr: 2 }}>
                <InputLabel id='select-policy-schema' error={Boolean(errors.schema)}>
                  Schemas
                </InputLabel>
                <Controller
                  name='scope.schema'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Schemas'
                      onChange={e => handleChange(onChange, e)}
                      error={Boolean(errors.schema)}
                      labelId='select-policy-schema'
                    >
                      <MenuItem key={'*'} value={'*'}>
                        *
                      </MenuItem>
                      {store.schemas.map(item => {
                        return (
                          <MenuItem key={item.name} value={item.key}>
                            {item.name}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.schema && <FormHelperText sx={{ color: 'error.main' }}>{errors.schema.message}</FormHelperText>}
              </FormControl>
              <FormControl xs={4}>
                <InputLabel id='select-policy-table' error={Boolean(errors.table)}>
                  Tables
                </InputLabel>
                <Controller
                  name='scope.table'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Tables'
                      onChange={e => handleChange(onChange, e)}
                      error={Boolean(errors.table)}
                      labelId='select-policy-table'
                    >
                      <MenuItem key={'*'} value={'*'}>
                        *
                      </MenuItem>
                      {store.tables.map(item => {
                        return (
                          <MenuItem key={item.name} value={item.key}>
                            {item.name}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.table && <FormHelperText sx={{ color: 'error.main' }}>{errors.table.message}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant='subtitle1'>Matching expression</Typography>
              <Typography sx={{ mb: 2 }} variant='body2'>
                Define the matching expression using applicable tag names.
              </Typography>
              <FormControl fullWidth>
                <Controller
                  name='expression'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <TextField
                      value={value}
                      label='Expression'
                      multiline
                      rows={2}
                      onChange={onChange}
                      placeholder=''
                      error={Boolean(errors.expression)}
                      data-refer='column-mask-expression-field'
                    />
                  )}
                />
                {errors.expression && (
                  <FormHelperText sx={{ color: 'error.main' }}>{errors.expression.message}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id='select-policy-columnMask' error={Boolean(errors.columnMask)}>
                  Column Mask
                </InputLabel>
                <Controller
                  name='columnMask'
                  control={control}
                  rules={{ required: false }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Column Mask'
                      multiple
                      onChange={e => handleMultipleChange(onChange, e)}
                      error={Boolean(errors.columnMask)}
                      labelId='select-policy-table'
                      input={<OutlinedInput id='select-policy-columnMask' label='Column Mask' />}
                      renderValue={selected => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map(value => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {store.Column_Mask.map(item => {
                        return (
                          <MenuItem key={item.name} value={item.name}>
                            {item.name}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.columnMask && (
                  <FormHelperText sx={{ color: 'error.main' }}>{errors.columnMask.message}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id='select-policy-rowFilter' error={Boolean(errors.rowFilter)}>
                  Row Filter
                </InputLabel>
                <Controller
                  name='rowFilter'
                  control={control}
                  rules={{ required: false }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Row Filter'
                      multiple
                      onChange={e => handleMultipleChange(onChange, e)}
                      error={Boolean(errors.rowFilter)}
                      labelId='select-policy-table'
                      input={<OutlinedInput id='select-policy-rowFilter' label='Row Filter' />}
                      renderValue={selected => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map(value => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {store.Row_Filter.map(item => {
                        return (
                          <MenuItem key={item.name} value={item.name}>
                            {item.name}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.rowFilter && (
                  <FormHelperText sx={{ color: 'error.main' }}>{errors.rowFilter.message}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: 'center',
            px: theme => [`${theme.spacing(5)} !important`, `${theme.spacing(15)} !important`],
            pb: theme => [`${theme.spacing(5)} !important`, `${theme.spacing(12.5)} !important`]
          }}
        >
          <Button variant='contained' sx={{ mr: 1 }} type='submit' data-refer='handle-submit-tag'>
            {type === 'create' ? 'Create' : 'Update'}
          </Button>
          <Button variant='outlined' onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CreateAccessPolicyDialog
