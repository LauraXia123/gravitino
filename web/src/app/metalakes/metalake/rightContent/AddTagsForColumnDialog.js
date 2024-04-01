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
  Typography,
  DialogContent,
  DialogActions,
  IconButton,
  Fade,
  Select,
  OutlinedInput,
  Chip,
  InputLabel,
  MenuItem,
  FormControl,
  FormHelperText
} from '@mui/material'

import Icon from '@/components/Icon'

import { useAppDispatch, useAppSelector } from '@/lib/hooks/useStore'
import { addTagForColumn } from '@/lib/store/metalakes'
import { useSearchParams } from 'next/navigation'

import * as yup from 'yup'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

import { fetchComplianceList } from '@/lib/store/metalakes'

const defaultValues = {
  tags: []
}

const schema = yup.object().shape({
  tags: yup.array().required()
})

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

const AddTagsDialog = props => {
  const { open, setOpen, rowData } = props

  const dispatch = useAppDispatch()
  const store = useAppSelector(state => state.metalakes)
  const searchParams = useSearchParams()
  const metalake = searchParams.get('metalake')

  const [unselectedTags, setFilteredTags] = useState([])

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
        dispatch(addTagForColumn({ data, column: rowData.name })).then(res => {
          if (!res.payload?.err) {
            handleClose()
          }
        })
      })
      .catch(err => {
        console.error('valid error', err)
      })
  }

  const onError = errors => {
    console.error('fields error', errors)
  }

  const handleMultipleChange = (onChange, e) => {
    const {
      target: { value }
    } = e
    onChange(typeof value === 'string' ? value.split(',') : value)
  }

  useEffect(() => {
    if (open && JSON.stringify(rowData) !== '{}') {
      dispatch(fetchComplianceList({ init: false, metalake, compliance: 'Tag' }))
      setValue('tags', [])

      const tagNames = store.Tag.map(t => t.name)
      const filteredTags = rowData.tags ? tagNames.filter(t => !rowData.tags.includes(t)) : tagNames
      setFilteredTags(filteredTags)
    }
  }, [open, rowData, setValue, store.Tag, dispatch, metalake, setFilteredTags])

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
              Add tags for {rowData.name}
            </Typography>
          </Box>

          <Grid container spacing={6}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id='add-tags-select' error={Boolean(errors.tags)}>
                  Tags
                </InputLabel>
                <Controller
                  name='tags'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      label='Tags'
                      multiple
                      onChange={e => handleMultipleChange(onChange, e)}
                      error={Boolean(errors.tags)}
                      labelId='add-tags-select'
                      input={<OutlinedInput id='add-tags-select' label='Tags' />}
                      renderValue={selected => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map(value => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {unselectedTags.map(item => {
                        return (
                          <MenuItem key={item} value={item}>
                            {item}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.tags && <FormHelperText sx={{ color: 'error.main' }}>{errors.tags.message}</FormHelperText>}
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
            Submit
          </Button>
          <Button variant='outlined' onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddTagsDialog
