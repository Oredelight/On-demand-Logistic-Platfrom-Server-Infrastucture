"""rename item_name to name in food_items

Revision ID: 93fe06cd7270
Revises: 93f9d314a12f
Create Date: 2026-02-28 13:59:02.430867

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '93fe06cd7270'
down_revision: Union[str, Sequence[str], None] = '93f9d314a12f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    with op.batch_alter_table("food_items") as batch_op:
        batch_op.alter_column(
            "item_name",
            new_column_name="name"
        )

def downgrade():
    with op.batch_alter_table("food_items") as batch_op:
        batch_op.alter_column(
            "name",
            new_column_name="item_name"
        )