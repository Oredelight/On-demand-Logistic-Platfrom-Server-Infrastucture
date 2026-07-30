import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database.models import Address, User
from database.schemas import AddressCreate

logger = logging.getLogger(__name__)


def add_address(db: Session, user: User, data: AddressCreate) -> Address:
    # If this is set as default, clear existing defaults first
    if data.is_default:
        db.query(Address).filter_by(user_id=user.id, is_default=True).update({"is_default": False})
        db.commit()

    # If user has no addresses yet, auto-set as default
    existing_count = db.query(Address).filter_by(user_id=user.id).count()
    is_default = data.is_default or (existing_count == 0)

    address = Address(
        user_id=user.id,
        label=data.label,
        street=data.street,
        city=data.city,
        state=data.state,
        landmark=data.landmark,
        is_default=is_default,
    )
    db.add(address)
    db.commit()
    db.refresh(address)

    logger.info(f"[ADDRESS] Added address id={address.id} for user={user.id}")
    return address


def get_user_addresses(db: Session, user: User) -> list[Address]:
    return db.query(Address).filter_by(user_id=user.id).order_by(
        Address.is_default.desc(), Address.created_at.desc()
    ).all()


def get_address_by_id(db: Session, user: User, address_id: int) -> Address:
    address = db.query(Address).filter_by(id=address_id, user_id=user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address


def set_default_address(db: Session, user: User, address_id: int) -> Address:
    # Clear all defaults
    db.query(Address).filter_by(user_id=user.id, is_default=True).update({"is_default": False})

    # Set new default
    address = db.query(Address).filter_by(id=address_id, user_id=user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    address.is_default = True
    db.commit()
    db.refresh(address)

    logger.info(f"[ADDRESS] Set default address id={address_id} for user={user.id}")
    return address


def delete_address(db: Session, user: User, address_id: int) -> dict:
    address = db.query(Address).filter_by(id=address_id, user_id=user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default
    db.delete(address)
    db.commit()

    # If the deleted address was the default, auto-promote another
    if was_default:
        next_addr = db.query(Address).filter_by(user_id=user.id).first()
        if next_addr:
            next_addr.is_default = True
            db.commit()

    return {"message": "Address deleted successfully"}
