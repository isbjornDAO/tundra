import { NavLink } from 'react-router-dom'

const NotFound = () => {
    return (
        <div className='flex flex-col items-center gap-8'>
            <h1 className='text-5xl mt-20'>404 Page Not Found</h1>
            <NavLink to="/" className="btn">Back to Home</NavLink>

        </div>
    )
}

export default NotFound