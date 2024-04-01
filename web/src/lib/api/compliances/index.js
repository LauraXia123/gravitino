/*
 * Copyright 2023 Datastrato Pvt Ltd.
 * This software is licensed under the Apache License version 2.
 */

export const getComplianceListApi = ({ metalake, compliance }) => {
  const time = new Date().getTime()
  switch (compliance) {
    case 'Tag':
      return Promise.resolve([
        {
          name: 'PII-address',
          description: 'This is PII-address tag',
          createdBy: 'Gravitino',
          createdTime: time
        },
        {
          name: 'PII-email',
          description: 'This is PII-email tag',
          createdBy: 'Gravitino',
          createdTime: time
        },
        {
          name: 'PII-phone',
          description: 'This is PII-phone tag',
          createdBy: 'Gravitino',
          createdTime: time
        },
        {
          name: 'Marketing',
          description: 'This is Marketing tag',
          createdBy: 'Gravitino',
          createdTime: time
        },
        {
          name: 'HR',
          description: 'This is HR tag',
          createdBy: 'Gravitino',
          createdTime: time
        },
        {
          name: 'Cost-center',
          description: 'This is Cost-center tag',
          createdBy: 'Gravitino',
          createdTime: time
        }
      ])
    case 'Column_Mask':
      return Promise.resolve([
        {
          name: 'Full mask',
          dataType: 'Any',
          expression: '******',
          description: 'This is full mask',
          createdTime: time
        },
        {
          name: 'Partial mask',
          dataType: 'Varchar',
          expression: 'CONCAT(SUBSTRING( 1, 3), "****", SUBSTRING(-2))',
          description: 'This is partial mask',
          createdTime: time
        },
        {
          name: 'Hash',
          dataType: 'Varchar',
          expression: 'md5()',
          description: 'This is hash',
          createdTime: time
        }
      ])
    case 'Row_Filter':
      return Promise.resolve([
        {
          name: 'Us_filter',
          expression: 'region="US" or current_role="admin"',
          description: 'Keep US data only',
          createdTime: time
        },
        {
          name: 'JP_filter',
          expression: 'region="Japan" or current_role="admin"',
          description: 'Keep Japan data only',
          createdTime: time
        }
      ])
    case 'Access_Policy':
      return Promise.resolve([])
    default:
      return Promise.resolve([])
  }
}

export const createTagApi = ({ data, metalake }) => {
  const resData = { ...data, createdBy: 'Gravitino', createdTime: new Date().getTime() }

  return Promise.resolve(resData)
}

export const createColumnMaskApi = ({ data, metalake }) => {
  const resData = { ...data, createdTime: new Date().getTime() }

  return Promise.resolve(resData)
}

export const createRowFilterApi = ({ data, metalake }) => {
  const resData = { ...data, createdTime: new Date().getTime() }

  return Promise.resolve(resData)
}

export const createAccessPolicyApi = ({ data, metalake }) => {
  const resData = { ...data, createdTime: new Date().getTime() }

  return Promise.resolve(resData)
}
