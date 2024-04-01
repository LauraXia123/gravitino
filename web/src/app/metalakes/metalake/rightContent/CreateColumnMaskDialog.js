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
  FormControl,
  FormHelperText
} from '@mui/material'

import Icon from '@/components/Icon'

import { useAppDispatch } from '@/lib/hooks/useStore'
import { createColumnMask, updateColumnMask } from '@/lib/store/metalakes'

import * as yup from 'yup'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

import { genUpdates } from '@/lib/utils'
import { nameRegex } from '@/lib/utils/regex'
import { useSearchParams } from 'next/navigation'

const defaultValues = {
  name: '',
  dataType: 'Any',
  expression: '',
  description: ''
}

const schema = yup.object().shape({
  name: yup
    .string()
    .required()
    .matches(
      nameRegex,
      'This field must start with a letter or underscore, and can only contain letters, numbers, and underscores'
    ),
  dataType: yup.mixed().oneOf(['Any', 'Varchar']).required(),
  expression: yup.string().required()
})

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

const CreateColumnMaskDialog = props => {
  const { open, setOpen, type = 'create', data = {} } = props
  const searchParams = useSearchParams()
  const metalake = searchParams.get('metalake')

  const dispatch = useAppDispatch()

  const [cacheData, setCacheData] = useState()

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

  const onSubmit = data => {
    trigger()

    schema
      .validate(data)
      .then(() => {
        if (type === 'create') {
          dispatch(createColumnMask({ data, metalake })).then(res => {
            if (!res.payload?.err) {
              handleClose()
            }
          })
        } else {
          const reqData = { updates: genUpdates(cacheData, data) }

          if (reqData.updates.length !== 0) {
            dispatch(updateColumnMask({ metalake, tag: cacheData.name, data: reqData })).then(res => {
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
      setValue('dataType', data.dataType)
      setValue('expression', data.expression)
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
              {type === 'create' ? 'Create' : 'Edit'} Column Mask
            </Typography>
          </Box>

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
                      data-refer='column-mask-name-field'
                    />
                  )}
                />
                {errors.name && <FormHelperText sx={{ color: 'error.main' }}>{errors.name.message}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id='select-data-type' error={Boolean(errors.type)}>
                  Data Type
                </InputLabel>
                <Controller
                  name='dataType'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Data Type'
                      defaultValue='Any'
                      onChange={onChange}
                      error={Boolean(errors.type)}
                      labelId='select-data-type'
                      disabled={type === 'update'}
                    >
                      <MenuItem value={'Any'}>Any</MenuItem>
                      <MenuItem value={'Varchar'}>Varchar</MenuItem>
                    </Select>
                  )}
                />
                {errors.type && <FormHelperText sx={{ color: 'error.main' }}>{errors.type.message}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
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
                      data-refer='column-mask-description-field'
                    />
                  )}
                />
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

export default CreateColumnMaskDialog
