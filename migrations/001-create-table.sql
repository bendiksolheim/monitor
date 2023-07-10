--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table services (
  id   integer primary key,
  service text not null,
  status integer not null references status(id)
  created timestamp default (strftime('%s', 'now'))
);

create table status (
  id integer primary key,
  status text not null,
)

insert into status(status) values ('OK')
insert into status(status) values ('ERROR')

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE services;
DROP TABLE status;
