/*
 * Copyright 2023 Datastrato Pvt Ltd.
 * This software is licensed under the Apache License version 2.
 */
package com.datastrato.gravitino.trino.connector;

import static com.datastrato.gravitino.trino.connector.metadata.TestGravitinoSchema.mockSchema;
import static com.datastrato.gravitino.trino.connector.metadata.TestGravitinoTable.mockTable;
import static java.util.Collections.emptyMap;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.datastrato.gravitino.Audit;
import com.datastrato.gravitino.Catalog;
import com.datastrato.gravitino.NameIdentifier;
import com.datastrato.gravitino.Namespace;
import com.datastrato.gravitino.client.GravitinoAdminClient;
import com.datastrato.gravitino.client.GravitinoMetalake;
import com.datastrato.gravitino.exceptions.NoSuchCatalogException;
import com.datastrato.gravitino.exceptions.NoSuchMetalakeException;
import com.datastrato.gravitino.rel.Column;
import com.datastrato.gravitino.rel.Schema;
import com.datastrato.gravitino.rel.SupportsSchemas;
import com.datastrato.gravitino.rel.Table;
import com.datastrato.gravitino.rel.TableCatalog;
import com.datastrato.gravitino.rel.TableChange;
import com.datastrato.gravitino.trino.connector.catalog.CatalogConnectorManager;
import com.datastrato.gravitino.trino.connector.catalog.CatalogConnectorMetadataAdapter;
import com.datastrato.gravitino.trino.connector.catalog.hive.HiveDataTypeTransformer;
import com.datastrato.gravitino.trino.connector.metadata.GravitinoCatalog;
import com.datastrato.gravitino.trino.connector.metadata.GravitinoColumn;
import com.datastrato.gravitino.trino.connector.metadata.GravitinoSchema;
import com.datastrato.gravitino.trino.connector.metadata.GravitinoTable;
import com.datastrato.gravitino.trino.connector.util.GeneralDataTypeTransformer;
import com.google.common.base.Preconditions;
import io.trino.plugin.memory.MemoryConnector;
import io.trino.spi.connector.ColumnHandle;
import io.trino.spi.connector.ConnectorMetadata;
import io.trino.spi.connector.ConnectorTableHandle;
import io.trino.spi.connector.ConnectorTableMetadata;
import io.trino.spi.connector.SchemaTableName;
import io.trino.testing.ResourcePresence;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;

public class GravitinoMockServer implements AutoCloseable {

  private final String testMetalake = "test";
  private final String testCatalog = "memory";
  private final String testCatalogProvider = "memory";

  private final Map<String, Metalake> metalakes = new HashMap<>();

  private boolean start = true;
  private boolean simpleCatalogName;
  CatalogConnectorManager catalogConnectorManager;
  private GeneralDataTypeTransformer dataTypeTransformer = new HiveDataTypeTransformer();

  public GravitinoMockServer() {
    this(false);
  }

  public GravitinoMockServer(boolean simpleCatalogName) {
    this.simpleCatalogName = simpleCatalogName;
    createMetalake(NameIdentifier.ofMetalake(testMetalake));
    createCatalog(NameIdentifier.ofCatalog(testMetalake, testCatalog));
  }

  public void setCatalogConnectorManager(CatalogConnectorManager catalogConnectorManager) {
    this.catalogConnectorManager = catalogConnectorManager;
  }

  public GravitinoAdminClient createGravitinoClient() {
    GravitinoAdminClient client = mock(GravitinoAdminClient.class);

    when(client.createMetalake(any(NameIdentifier.class), anyString(), anyMap()))
        .thenAnswer(
            new Answer<GravitinoMetalake>() {
              @Override
              public GravitinoMetalake answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier metalakeName = invocation.getArgument(0);
                return createMetalake(metalakeName);
              }
            });

    when(client.dropMetalake(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier metalakeName = invocation.getArgument(0);
                metalakes.remove(metalakeName.name());
                return true;
              }
            });

    when(client.loadMetalake(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<GravitinoMetalake>() {
              @Override
              public GravitinoMetalake answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier metalakeName = invocation.getArgument(0);
                if (!metalakes.containsKey(metalakeName.name())) {
                  throw new NoSuchMetalakeException("metalake does not be found");
                }
                return metalakes.get(metalakeName.name()).metalake;
              }
            });

    when(client.metalakeExists(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier metalakeName = invocation.getArgument(0);
                return metalakes.containsKey(metalakeName.name());
              }
            });

    return client;
  }

  private GravitinoMetalake createMetalake(NameIdentifier metalakeName) {
    GravitinoMetalake metaLake = mock(GravitinoMetalake.class);
    when(metaLake.name()).thenReturn(metalakeName.name());
    when(metaLake.listCatalogs(any(Namespace.class)))
        .thenAnswer(
            new Answer<NameIdentifier[]>() {
              @Override
              public NameIdentifier[] answer(InvocationOnMock invocation) throws Throwable {
                return metalakes.get(metalakeName.name()).catalogs.keySet().stream()
                    .map(catalogName -> NameIdentifier.ofCatalog(metalakeName.name(), catalogName))
                    .toArray(NameIdentifier[]::new);
              };
            });

    when(metaLake.createCatalog(
            any(NameIdentifier.class), any(Catalog.Type.class), anyString(), anyString(), anyMap()))
        .thenAnswer(
            new Answer<Catalog>() {
              @Override
              public Catalog answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier catalogName = invocation.getArgument(0);

                Catalog catalog = createCatalog(catalogName);

                return catalog;
              }
            });

    when(metaLake.dropCatalog(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier catalogName = invocation.getArgument(0);
                if (!metalakes.get(metalakeName.name()).catalogs.containsKey(catalogName.name())) {
                  throw new NoSuchCatalogException("catalog does not be found");
                }
                metalakes.get(metalakeName.name()).catalogs.remove(catalogName.name());
                return true;
              }
            });

    when(metaLake.catalogExists(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier catalogName = invocation.getArgument(0);
                return metalakes.get(metalakeName.name()).catalogs.containsKey(catalogName.name());
              }
            });

    when(metaLake.loadCatalog(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Catalog>() {
              @Override
              public Catalog answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier catalogName = invocation.getArgument(0);
                if (!metalakes.get(metalakeName.name()).catalogs.containsKey(catalogName.name())) {
                  throw new NoSuchCatalogException("catalog does not be found");
                }

                return metalakes.get(metalakeName.name()).catalogs.get(catalogName.name());
              }
            });
    metalakes.put(metalakeName.name(), new Metalake(metaLake));
    return metaLake;
  }

  void reloadCatalogs() {
    GravitinoMetalake metaLake = mock(GravitinoMetalake.class);
    when(metaLake.name()).thenReturn(testMetalake);
    when(metaLake.listCatalogs(any()))
        .thenReturn(new NameIdentifier[] {NameIdentifier.ofCatalog(testMetalake, testCatalog)});
    catalogConnectorManager.loadCatalogs(metaLake);
  }

  private Catalog createCatalog(NameIdentifier catalogName) {
    Catalog catalog = mock(Catalog.class);
    when(catalog.name()).thenReturn(catalogName.name());
    when(catalog.provider()).thenReturn(testCatalogProvider);
    when(catalog.type()).thenReturn(Catalog.Type.RELATIONAL);
    when(catalog.properties()).thenReturn(Map.of("max_ttl", "10"));

    Audit mockAudit = mock(Audit.class);
    when(mockAudit.creator()).thenReturn("gravitino");
    when(mockAudit.createTime()).thenReturn(Instant.now());
    when(catalog.auditInfo()).thenReturn(mockAudit);

    GravitinoCatalog gravitinoCatalog =
        new GravitinoCatalog(testMetalake, catalog, simpleCatalogName);
    when(catalog.asTableCatalog()).thenAnswer(answer -> createTableCatalog(gravitinoCatalog));

    when(catalog.asSchemas()).thenAnswer(answer -> createSchemas(gravitinoCatalog));
    metalakes.get(catalogName.namespace().toString()).catalogs.put(catalogName.name(), catalog);
    return catalog;
  }

  private SupportsSchemas createSchemas(GravitinoCatalog catalog) {
    SupportsSchemas schemas = mock(SupportsSchemas.class);
    when(schemas.createSchema(any(NameIdentifier.class), anyString(), anyMap()))
        .thenAnswer(
            new Answer<Schema>() {
              @Override
              public Schema answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier schemaName = invocation.getArgument(0);
                Map<String, String> properties = invocation.getArgument(2);

                // create schema
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);

                catalogConnectorManager
                    .getCatalogConnector(catalog.getFullName())
                    .getMetadataAdapter();
                GravitinoSchema schema = new GravitinoSchema(schemaName.name(), properties, "");
                metadata.createSchema(null, schemaName.name(), emptyMap(), null);

                Schema mockSchema =
                    mockSchema(schema.getName(), schema.getComment(), schema.getProperties());
                return mockSchema;
              }
            });

    when(schemas.dropSchema(any(NameIdentifier.class), anyBoolean()))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                boolean cascade = invocation.getArgument(1);

                // drop schema,
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                metadata.dropSchema(null, nameIdentifier.name(), cascade);
                return true;
              }
            });

    when(schemas.listSchemas(any(Namespace.class)))
        .thenAnswer(
            new Answer<NameIdentifier[]>() {
              @Override
              public NameIdentifier[] answer(InvocationOnMock invocation) throws Throwable {
                Namespace namespace = invocation.getArgument(0);
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                return metadata.listSchemaNames(null).stream()
                    .map(
                        schemaName ->
                            NameIdentifier.ofSchema(
                                namespace.level(0), namespace.level(1), schemaName))
                    .toArray(NameIdentifier[]::new);
              }
            });

    when(schemas.loadSchema(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Schema>() {
              @Override
              public Schema answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier schemaName = invocation.getArgument(0);
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                memoryConnector.getMetadata(null, null);
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                Map<String, Object> schemaProperties =
                    metadata.getSchemaProperties(null, schemaName.name());

                CatalogConnectorMetadataAdapter metadataAdapter =
                    catalogConnectorManager
                        .getCatalogConnector(catalog.getFullName())
                        .getMetadataAdapter();

                GravitinoSchema gravitinoSchema =
                    new GravitinoSchema(
                        schemaName.name(),
                        metadataAdapter.toGravitinoSchemaProperties(schemaProperties),
                        "");

                Schema mockSchema =
                    mockSchema(
                        gravitinoSchema.getName(),
                        gravitinoSchema.getComment(),
                        gravitinoSchema.getProperties());
                return mockSchema;
              }
            });
    return schemas;
  }

  private TableCatalog createTableCatalog(GravitinoCatalog catalog) {
    TableCatalog tableCatalog = mock(TableCatalog.class);
    when(tableCatalog.createTable(
            any(NameIdentifier.class),
            any(Column[].class),
            anyString(),
            anyMap(),
            any(),
            any(),
            any()))
        .thenAnswer(
            new Answer<Table>() {
              @Override
              public Table answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                TableName tableName = new TableName(nameIdentifier);
                Column[] columns = invocation.getArgument(1);
                String comment = invocation.getArgument(2);
                Map<String, String> properties = invocation.getArgument(3);

                GravitinoTable gravitinoTable =
                    new GravitinoTable(
                        tableName.schema(), tableName.table(), columns, comment, properties);
                CatalogConnectorMetadataAdapter metadataAdapter =
                    catalogConnectorManager
                        .getCatalogConnector(catalog.getFullName())
                        .getMetadataAdapter();
                ConnectorTableMetadata tableMetadata =
                    metadataAdapter.getTableMetadata(gravitinoTable);

                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                metadata.createTable(null, tableMetadata, false);
                return null;
              }
            });

    when(tableCatalog.dropTable(any(NameIdentifier.class)))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                TableName tableName = new TableName(nameIdentifier);
                // todo
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                memoryConnector.getMetadata(null, null);
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                ConnectorTableHandle tableHandle =
                    metadata.getTableHandle(
                        null,
                        new SchemaTableName(tableName.schema(), tableName.table()),
                        Optional.empty(),
                        Optional.empty());
                metadata.dropTable(null, tableHandle);
                return true;
              }
            });

    when(tableCatalog.purgeTable(any(NameIdentifier.class)))
        .thenThrow(new UnsupportedOperationException());

    when(tableCatalog.listTables(any(Namespace.class)))
        .thenAnswer(
            new Answer<NameIdentifier[]>() {
              @Override
              public NameIdentifier[] answer(InvocationOnMock invocation) throws Throwable {
                Namespace schemaName = invocation.getArgument(0);
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                ArrayList<NameIdentifier> tableNames = new ArrayList<>();
                for (SchemaTableName tableName : metadata.listTables(null, Optional.empty())) {
                  tableNames.add(
                      NameIdentifier.ofTable(
                          schemaName.level(0),
                          schemaName.level(1),
                          schemaName.level(2),
                          tableName.getTableName()));
                }
                return tableNames.toArray(new NameIdentifier[tableNames.size()]);
              }
            });

    when(tableCatalog.tableExists(any()))
        .thenAnswer(
            new Answer<Boolean>() {
              @Override
              public Boolean answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                TableName tableName = new TableName(nameIdentifier);
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                return metadata.getTableHandle(
                        null,
                        new SchemaTableName(tableName.schema(), tableName.table()),
                        Optional.empty(),
                        Optional.empty())
                    != null;
              }
            });

    when(tableCatalog.loadTable(any()))
        .thenAnswer(
            new Answer<Table>() {
              @Override
              public Table answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                TableName tableName = new TableName(nameIdentifier);
                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();

                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                ConnectorTableHandle tableHandle =
                    metadata.getTableHandle(
                        null,
                        new SchemaTableName(tableName.schema(), tableName.table()),
                        Optional.empty(),
                        Optional.empty());
                ConnectorTableMetadata tableMetadata = metadata.getTableMetadata(null, tableHandle);

                CatalogConnectorMetadataAdapter metadataAdapter =
                    catalogConnectorManager
                        .getCatalogConnector(catalog.getFullName())
                        .getMetadataAdapter();
                GravitinoTable gravitinoTable = metadataAdapter.createTable(tableMetadata);

                Table table =
                    mockTable(
                        gravitinoTable.getName(),
                        gravitinoTable.getRawColumns(),
                        gravitinoTable.getComment(),
                        gravitinoTable.getProperties(),
                        gravitinoTable.getPartitioning(),
                        gravitinoTable.getSortOrders(),
                        gravitinoTable.getDistribution());
                return table;
              }
            });

    when(tableCatalog.alterTable(any(NameIdentifier.class), any(TableChange[].class)))
        .thenAnswer(
            new Answer<Table>() {
              @Override
              public Table answer(InvocationOnMock invocation) throws Throwable {
                NameIdentifier nameIdentifier = invocation.getArgument(0);
                TableName tableName = new TableName(nameIdentifier);

                MemoryConnector memoryConnector =
                    (MemoryConnector)
                        catalogConnectorManager
                            .getCatalogConnector(catalog.getFullName())
                            .getInternalConnector();
                ConnectorMetadata metadata = memoryConnector.getMetadata(null, null);
                ConnectorTableHandle tableHandle =
                    metadata.getTableHandle(
                        null,
                        new SchemaTableName(tableName.schema(), tableName.table()),
                        Optional.empty(),
                        Optional.empty());

                for (int i = 1; i < invocation.getArguments().length; i++) {
                  TableChange tableChange = invocation.getArgument(i);
                  doAlterTable(tableChange, tableHandle, tableName, metadata, catalog);
                }
                return null;
              }
            });
    return tableCatalog;
  }

  void doAlterTable(
      TableChange tableChange,
      ConnectorTableHandle tableHandle,
      TableName tableName,
      ConnectorMetadata metadata,
      GravitinoCatalog catalog) {
    if (tableChange instanceof TableChange.RenameTable) {
      TableChange.RenameTable renameTable = (TableChange.RenameTable) tableChange;
      metadata.renameTable(
          null, tableHandle, new SchemaTableName(tableName.schema(), renameTable.getNewName()));

    } else if (tableChange instanceof TableChange.AddColumn) {
      TableChange.AddColumn addColumn = (TableChange.AddColumn) tableChange;
      String fieldName = addColumn.fieldName()[0];
      GravitinoColumn column =
          new GravitinoColumn(fieldName, addColumn.getDataType(), -1, "", true);
      CatalogConnectorMetadataAdapter metadataAdapter =
          catalogConnectorManager.getCatalogConnector(catalog.getFullName()).getMetadataAdapter();
      metadata.addColumn(null, tableHandle, metadataAdapter.getColumnMetadata(column));

    } else if (tableChange instanceof TableChange.DeleteColumn) {
      TableChange.DeleteColumn deleteColumn = (TableChange.DeleteColumn) tableChange;
      String fieldName = deleteColumn.fieldName()[0];
      ColumnHandle columnHandle = metadata.getColumnHandles(null, tableHandle).get(fieldName);
      metadata.dropColumn(null, tableHandle, columnHandle);

    } else if (tableChange instanceof TableChange.RenameColumn) {
      TableChange.RenameColumn renameColumn = (TableChange.RenameColumn) tableChange;
      String fieldName = renameColumn.fieldName()[0];
      ColumnHandle columnHandle = metadata.getColumnHandles(null, tableHandle).get(fieldName);
      metadata.renameColumn(null, tableHandle, columnHandle, renameColumn.getNewName());

    } else if (tableChange instanceof TableChange.UpdateColumnType) {
      TableChange.UpdateColumnType updateColumnType = (TableChange.UpdateColumnType) tableChange;
      String fieldName = updateColumnType.fieldName()[0];
      ColumnHandle columnHandle = metadata.getColumnHandles(null, tableHandle).get(fieldName);
      metadata.setColumnType(
          null,
          tableHandle,
          columnHandle,
          dataTypeTransformer.getTrinoType(updateColumnType.getNewDataType()));

    } else if (tableChange instanceof TableChange.UpdateComment) {
      TableChange.UpdateComment updateComment = (TableChange.UpdateComment) tableChange;
      metadata.setTableComment(null, tableHandle, Optional.of(updateComment.getNewComment()));

    } else if (tableChange instanceof TableChange.UpdateColumnComment) {
      TableChange.UpdateColumnComment updateColumnComment =
          (TableChange.UpdateColumnComment) tableChange;
      ColumnHandle columnHandle =
          metadata.getColumnHandles(null, tableHandle).get(updateColumnComment.fieldName()[0]);
      metadata.setColumnComment(
          null, tableHandle, columnHandle, Optional.of(updateColumnComment.getNewComment()));

    } else if (tableChange instanceof TableChange.SetProperty) {
      TableChange.SetProperty setProperty = (TableChange.SetProperty) tableChange;
      metadata.setTableProperties(
          null,
          tableHandle,
          Map.of(setProperty.getProperty(), Optional.of(setProperty.getValue())));
    }
  }

  @ResourcePresence
  public boolean isRunning() {
    return start;
  }

  @Override
  public void close() {
    start = false;
  }

  static class TableName {
    NameIdentifier nameIdentifier;

    TableName(NameIdentifier nameIdentifier) {
      Preconditions.checkArgument(
          nameIdentifier.namespace().length() == 3,
          "Not a table nameIdentifier: " + nameIdentifier);
      this.nameIdentifier = nameIdentifier;
    }

    String schema() {
      return nameIdentifier.namespace().level(2);
    }

    String table() {
      return nameIdentifier.name();
    }
  }

  static class Metalake {
    GravitinoMetalake metalake;
    Map<String, Catalog> catalogs = new HashMap<>();

    public Metalake(GravitinoMetalake metaLake) {
      this.metalake = metaLake;
    }
  }
}
