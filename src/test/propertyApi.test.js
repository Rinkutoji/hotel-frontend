import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { publicProperties, staffProperties, staffBuildings } from '../api/propertyApi'

describe('propertyApi', () => {
  let mock
  beforeEach(() => { mock = new MockAdapter(apiClient) })
  afterEach(() => { mock.restore() })

  it('publicProperties.list calls GET /public/properties with no params', async () => {
    mock.onGet('/public/properties').reply(200, { success: true, data: [] })
    const res = await publicProperties.list()
    expect(res.data.success).toBe(true)
    expect(mock.history.get[0].params).toBeUndefined()
  })

  it('staffProperties.list sends query params', async () => {
    mock.onGet('/staff/properties').reply(200, { success: true, data: [] })
    await staffProperties.list({ page: 1, per_page: 50, search: 'Main' })
    expect(mock.history.get[0].params).toEqual({ page: 1, per_page: 50, search: 'Main' })
  })

  it('staffProperties.list handles errors', async () => {
    mock.onGet('/staff/properties').reply(500, { success: false, message: 'Server error' })
    await expect(staffProperties.list()).rejects.toThrow()
  })

  it('staffProperties.show calls GET /staff/properties/:id', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: { id: 5, name: 'Main' } })
    const res = await staffProperties.show(5)
    expect(res.data.data.id).toBe(5)
    expect(res.data.data.name).toBe('Main')
  })

  it('staffProperties.create POSTs the payload', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    await staffProperties.create({ name: 'New', code: 'NEW', status: 'active' })
    const req = mock.history.post[0]
    expect(req.url).toBe('/staff/properties')
    expect(JSON.parse(req.data)).toEqual({ name: 'New', code: 'NEW', status: 'active' })
  })

  it('staffProperties.update PUTs to /staff/properties/:id', async () => {
    mock.onPut('/staff/properties/5').reply(200, { success: true, data: { id: 5 } })
    await staffProperties.update(5, { name: 'Updated', status: 'inactive' })
    expect(mock.history.put[0].url).toBe('/staff/properties/5')
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ name: 'Updated', status: 'inactive' })
  })

  it('staffProperties.destroy calls DELETE /staff/properties/:id', async () => {
    mock.onDelete('/staff/properties/5').reply(200, { success: true })
    await staffProperties.destroy(5)
    expect(mock.history.delete[0].url).toBe('/staff/properties/5')
  })

  it('staffProperties.listBuildings calls GET /staff/properties/:id/buildings', async () => {
    mock.onGet('/staff/properties/5/buildings').reply(200, { success: true, data: [{ id: 1, name: 'East' }] })
    const res = await staffProperties.listBuildings(5)
    expect(res.data.data).toHaveLength(1)
    expect(res.data.data[0].name).toBe('East')
  })

  it('staffProperties.createBuilding POSTs to /staff/properties/:id/buildings', async () => {
    mock.onPost('/staff/properties/5/buildings').reply(201, { success: true, data: { id: 3 } })
    await staffProperties.createBuilding(5, { name: 'East Wing', code: 'EAST', status: 'active' })
    const req = mock.history.post[0]
    expect(req.url).toBe('/staff/properties/5/buildings')
    expect(JSON.parse(req.data)).toEqual({ name: 'East Wing', code: 'EAST', status: 'active' })
  })

  it('staffProperties.updateBuilding PUTs to /staff/buildings/:id', async () => {
    mock.onPut('/staff/buildings/3').reply(200, { success: true })
    await staffProperties.updateBuilding(3, { name: 'West Wing' })
    expect(mock.history.put[0].url).toBe('/staff/buildings/3')
  })

  it('staffProperties.destroyBuilding calls DELETE /staff/buildings/:id', async () => {
    mock.onDelete('/staff/buildings/3').reply(200, { success: true })
    await staffProperties.destroyBuilding(3)
    expect(mock.history.delete[0].url).toBe('/staff/buildings/3')
  })

  it('staffBuildings.show calls GET /staff/buildings/:id', async () => {
    mock.onGet('/staff/buildings/3').reply(200, { success: true, data: { id: 3, name: 'East', property_id: 5 } })
    const res = await staffBuildings.show(3)
    expect(res.data.data.id).toBe(3)
    expect(res.data.data.property_id).toBe(5)
  })
})